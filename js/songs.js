const INSTRUMENT_STEM_MAP = {
  'trash-lid': 'Drums',
  drums: 'Drums',
  bass: 'Bass',
  'electric-guitar': 'Lead',
  keys: 'Keys',
};

function buildSections(totalBeats) {
  const introLen = Math.round(totalBeats * 0.12);
  const outroLen = Math.round(totalBeats * 0.12);
  const verseLen = Math.round((totalBeats - introLen - outroLen) * 0.42);
  const chorusLen = totalBeats - introLen - verseLen - outroLen;
  const v1Start = introLen;
  const chorusStart = v1Start + verseLen;
  const outroStart = chorusStart + chorusLen;
  return [
    { id: 'intro', name: 'Intro', start: 0, end: introLen },
    { id: 'verse', name: 'Verse', start: v1Start, end: chorusStart },
    { id: 'chorus', name: 'Chorus', start: chorusStart, end: outroStart },
    { id: 'outro', name: 'Outro', start: outroStart, end: totalBeats },
  ];
}

function sectionAt(sections, beat) {
  if (!sections?.length) return { id: 'verse', name: 'Verse', start: 0, end: 9999 };
  return sections.find((s) => beat >= s.start && beat < s.end) || sections[sections.length - 1];
}

function getSongSection(song, elapsed, bpm) {
  const beat = elapsed / (60 / bpm);
  return sectionAt(song.sections, Math.min(beat, song.totalBeats - 1));
}

function getPlayerPartKey(instrument) {
  return INSTRUMENT_STEM_MAP[instrument?.id] || 'Drums';
}

function getPlayerStemKey(instrument) {
  return getPlayerPartKey(instrument);
}

function filterPartForInstrument(part, instrument) {
  if (!part?.length || !instrument) return part || [];
  if (getPlayerPartKey(instrument) === 'Drums') {
    return part.filter((ev) => !ev.hit || ev.hit === 'kick' || ev.hit === 'snare');
  }
  return part;
}

function getPartEvents(song, partKey, beat, instrument = null) {
  const raw = song.parts?.[partKey];
  const part = instrument ? filterPartForInstrument(raw, instrument) : raw;
  if (!part || beat < 0 || beat >= song.totalBeats) return [];
  return part.filter((e) => e.beat === Math.floor(beat));
}

function eventLabel(ev) { return ev.chord || ev.note || ev.hit || '•'; }

function getChartAudioTime(song, beat, bpm) {
  if (!song?.parts) {
    const beatDur = 60 / bpm;
    return (beat * beatDur) + (song?.beatOffset || 0);
  }
  for (const key of ['Drums', 'Bass', 'Lead', 'Keys']) {
    const ev = song.parts[key]?.find((e) => e.beat === beat);
    if (ev?.timeSec != null) return ev.timeSec;
  }
  const beatDur = 60 / bpm;
  return (beat * beatDur) + (song.beatOffset || 0);
}

function noteAudioTime(note, song, bpm) {
  if (note?.timeSec != null) return note.timeSec;
  return getChartAudioTime(song, note.beat, bpm);
}

function getAudioStartOffset(song, leadInBeat, bpm) {
  return 0;
}

function getSongPlayElapsed(elapsed, countdownSec = 4) {
  return Math.max(0, elapsed - countdownSec);
}

const GEM_CHART_LEAD_SEC = 2.5;
const GEM_MIN_APPROACH_SEC = 1.25;

function noteHitElapsed(note, song, leadInBeat, bpm) {
  return noteAudioTime(note, song, bpm) - getAudioStartOffset(song, leadInBeat, bpm);
}

function getUpcomingNotes(song, partKey, elapsed, bpm, lookAhead, hitBeats, missedBeats, leadInBeat = 0, instrument = null, countdownSec = 4) {
  const beatDur = 60 / bpm;
  const laBeats = lookAhead ?? 3;
  const laSec = laBeats * beatDur;
  const rawPart = song.parts?.[partKey] || [];
  const part = instrument ? filterPartForInstrument(rawPart, instrument) : (
    partKey === 'Drums' ? rawPart.filter((ev) => !ev.hit || ev.hit === 'kick' || ev.hit === 'snare') : rawPart
  );
  const songElapsed = getSongPlayElapsed(elapsed, countdownSec);
  if (elapsed < countdownSec) return [];

  const audioStart = getAudioStartOffset(song, leadInBeat, bpm);
  const gemChartStart = GEM_CHART_LEAD_SEC + GEM_MIN_APPROACH_SEC;
  const notes = [];

  for (const ev of part) {
    const key = noteKey(ev);
    if (hitBeats?.has(key) || missedBeats?.has(key)) continue;

    const hitElapsed = noteHitElapsed(ev, song, leadInBeat, bpm);
    if (hitElapsed < 0 || hitElapsed < gemChartStart) continue;

    const dur = ev.dur || 1;
    const durSec = dur * beatDur;
    const endElapsed = hitElapsed + durSec;
    const distSec = hitElapsed - songElapsed;

    if (distSec > laSec) continue;
    if (songElapsed > endElapsed + beatDur * 0.15) continue;

    const sec = sectionAt(song.sections, ev.beat);
    notes.push({
      ...ev,
      beat: ev.beat,
      dur,
      endBeat: ev.beat + dur,
      endElapsed,
      dist: distSec / beatDur,
      distSec,
      hitElapsed,
      active: songElapsed >= hitElapsed && songElapsed < endElapsed,
      section: sec?.name,
      label: eventLabel(ev),
      melodic: !!ev.chord || !!ev.note,
      isHold: dur > 1.05,
    });
  }
  return notes.sort((a, b) => a.hitElapsed - b.hitElapsed);
}

// Centralized hit-window tuning. These tap/hold windows used to be hand-copied
// in three places (here, plus checkMissedNotes and onNotePress in game.js), so
// tuning one without the others would silently desync miss-detection from
// press-detection. Anything reading timing windows should call this.
function getHitWindows(isMelodic, bpm) {
  const beatDur = 60 / bpm;
  return {
    beatDur,
    tapLate: (isMelodic ? 0.24 : 0.2) * beatDur,
    tapEarly: (isMelodic ? 0.14 : 0.12) * beatDur,
    holdLate: (isMelodic ? 0.5 : 0.45) * beatDur,
    holdEarly: (isMelodic ? 0.42 : 0.38) * beatDur,
    perfect: (isMelodic ? 0.14 : 0.12) * beatDur,
  };
}

function rateNotePress(notes, elapsed, bpm, isMelodic, hitBeats, countdownSec = 4, song = null, leadInBeat = 0) {
  const songElapsed = getSongPlayElapsed(elapsed, countdownSec);
  const { beatDur, tapLate, tapEarly, holdLate, holdEarly, perfect } = getHitWindows(isMelodic, bpm);
  let best = null;
  let bestDist = Infinity;
  let bestPhase = 'press';
  let bestFromBody = false;

  for (const n of notes) {
    const key = noteKey(n);
    if (hitBeats?.has(key)) continue;

    const hitElapsed = n.hitElapsed ?? noteHitElapsed(n, song || {}, leadInBeat, bpm);
    const distSec = hitElapsed - songElapsed;

    if (n.isHold) {
      const endElapsed = n.endElapsed ?? (hitElapsed + (n.dur || 1) * beatDur);
      const inBody = songElapsed >= hitElapsed && songElapsed < endElapsed;
      const inStartWindow = distSec >= -holdLate && distSec <= holdEarly;
      const bodyGraceLimit = Math.max(holdLate, (n.dur || 1) * beatDur * 0.55);
      const inBodyGrace = inBody && (songElapsed - hitElapsed) <= bodyGraceLimit;
      if (!inStartWindow && !inBodyGrace) continue;

      const fromBody = inBodyGrace && distSec <= 0;
      const startDist = fromBody ? songElapsed - hitElapsed : Math.abs(distSec);
      if (startDist < bestDist) {
        bestDist = startDist;
        best = n;
        bestPhase = 'hold-start';
        bestFromBody = fromBody;
      }
      continue;
    }

    if (distSec > tapEarly || distSec < -tapLate) continue;
    const d = Math.abs(distSec);
    if (d < bestDist) {
      bestDist = d;
      best = n;
      bestPhase = 'tap';
    }
  }

  if (!best) return { rating: 'miss', note: null, phase: 'press' };

  if (best.isHold) {
    if (!bestFromBody && bestDist > holdLate) return { rating: 'miss', note: null, phase: 'press' };
    const rating = bestDist <= perfect ? 'perfect' : 'good';
    return { rating, note: best, phase: bestPhase };
  }

  if (bestDist > tapLate) return { rating: 'miss', note: null, phase: 'press' };
  const rating = bestDist <= perfect ? 'perfect' : 'good';
  return { rating, note: best, phase: bestPhase };
}

function rateHoldRelease(activeNote, elapsed, bpm, countdownSec = 4) {
  if (!activeNote) return { rating: 'miss', note: null };
  const beatDur = 60 / bpm;
  const songElapsed = getSongPlayElapsed(elapsed, countdownSec);
  const hitElapsed = activeNote.hitElapsed ?? (activeNote.beat * beatDur);
  const held = songElapsed - hitElapsed;
  const required = (activeNote.dur || 1) * beatDur;
  if (held >= required * 0.7) return { rating: 'perfect', note: activeNote };
  if (held >= required * 0.45) return { rating: 'good', note: activeNote };
  return { rating: 'miss', note: activeNote };
}

function rateNoteHit(notes, elapsed, bpm, isMelodic, hitBeats, countdownSec = 4, song = null, leadInBeat = 0) {
  return rateNotePress(notes, elapsed, bpm, isMelodic, hitBeats, countdownSec, song, leadInBeat);
}
function noteKey(note) { return `${note.beat}:${note.chord || ''}:${note.note || ''}:${note.hit || ''}`; }

function getSong(id) {
  if (typeof SongLoader !== 'undefined') {
    const cached = SongLoader.getCached(id);
    if (cached) return cached;
    const catalog = typeof SongLoader.loadSongCatalog === 'function' ? SongLoader.loadSongCatalog() : [];
    const entry = catalog.find((s) => s.id === id) || catalog[0];
    if (entry) {
      return {
        id: entry.id,
        name: entry.name,
        emoji: entry.emoji,
        cost: entry.cost ?? 0,
        bpm: entry.bpm ?? 118,
        totalBeats: entry.beatCount ?? 118,
        durationSec: entry.durationSec ?? 60,
        sections: buildSections(entry.beatCount ?? 118),
        parts: {},
        stems: {},
        stemBacked: true,
      };
    }
  }
  return {
    id: 'rebel-pulse',
    name: 'Rebel Pulse',
    emoji: '⚡',
    cost: 0,
    bpm: 120,
    totalBeats: 120,
    durationSec: 60,
    sections: buildSections(120),
    parts: {},
    stems: {},
    stemBacked: true,
  };
}
