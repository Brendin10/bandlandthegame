const BandAudio = (() => {
  let members = [];
  let song = null;
  let bpm = 88;
  let running = false;
  let lastBeat = -1;
  let onMemberPlay = null;
  let stemBacked = false;

  const GHOST_PARTS = [
    { key: 'Drums', role: 'Drums', scale: 0.12 },
    { key: 'Bass', role: 'Bass', scale: 0.1 },
    { key: 'Keys', role: 'Keys', scale: 0.08 },
    { key: 'Lead', role: 'Lead', scale: 0.09 },
  ];

  const ROLE_TO_STEM = {
    Drums: 'Drums',
    Bass: 'Bass',
    Keys: 'Keys',
    Lead: 'Lead',
    Guitar: 'Lead',
  };

  function setBand(bandMembers, songObj) {
    members = bandMembers || [];
    song = songObj;
    stemBacked = !!song?.stemBacked;
  }

  function setOnMemberPlay(fn) {
    onMemberPlay = fn;
  }

  function hasRole(role) {
    return members.some((m) => m.role === role || (role === 'Lead' && m.role === 'Guitar'));
  }

  function getChordAtBeat(beat) {
    if (!song?.parts) return 'C';
    const keys = ['Lead', 'Keys', 'electric-guitar', 'keys'];
    for (const key of keys) {
      const part = song.parts[key];
      if (!part?.length) continue;
      let chord = 'C';
      for (const ev of part) {
        if (ev.beat > beat) break;
        if (ev.chord) chord = ev.chord;
      }
      return chord;
    }
    return 'C';
  }

  function sectionIntensity(secId) {
    if (secId === 'chorus') return 1;
    if (secId === 'verse') return 0.82;
    if (secId === 'intro') return 0.62;
    return 0.7;
  }

  function playGhostParts(ac, now, beatIdx, intensity) {
    if (stemBacked) return;
    const soloBoost = members.length === 0 ? 1.15 : 1;
    for (const ghost of GHOST_PARTS) {
      if (hasRole(ghost.role)) continue;
      const events = getPartEvents(song, ghost.key, beatIdx);
      events.forEach((ev) => {
        AudioEngine.playPartEvent(ev, ghost.key, ghost.scale * intensity * soloBoost);
      });
    }
  }

  function playMemberVisuals(beatIdx, intensity) {
    const bandVol = Math.min(0.45, 0.22 + members.length * 0.04);
    members.forEach((m, i) => {
      const stemKey = ROLE_TO_STEM[m.role] || m.role;
      const events = getPartEvents(song, stemKey, beatIdx);
      if (!events.length) return;
      setTimeout(() => {
        if (!stemBacked) {
          events.forEach((ev) => AudioEngine.playPartEvent(ev, stemKey, bandVol));
        }
        onMemberPlay?.(m, i);
      }, i * 25);
    });
  }

  function onBeat(beatIdx) {
    if (!running || !song) return;
    if (beatIdx === lastBeat) return;
    if (beatIdx >= (song.totalBeats || 9999)) return;
    lastBeat = beatIdx;

    const sec = sectionAt(song.sections, beatIdx);
    const intensity = sectionIntensity(sec?.id);

    if (!stemBacked) {
      const ac = AudioEngine.getCtx();
      const now = ac.currentTime;
      const chord = getChordAtBeat(beatIdx);
      AudioEngine.playDanceBeat(ac, now, beatIdx, 'funk-house', chord, sec?.id, intensity, 'rock');
      playGhostParts(ac, now, beatIdx, intensity);
    }

    playMemberVisuals(beatIdx, intensity);
  }

  function start(bpmVal) {
    bpm = bpmVal;
    running = true;
    lastBeat = -1;
  }

  function stop() {
    running = false;
    lastBeat = -1;
  }

  function syncToBeat(beatIdx) {
    lastBeat = beatIdx - 1;
  }

  return { setBand, setOnMemberPlay, start, stop, syncToBeat, onBeat, get running() { return running; } };
})();
