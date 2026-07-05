const RhythmLane = (() => {
  const HIT_X = 18;
  const LOOKAHEAD = 5.0;
  let lastHoldSparkAt = 0;
  let sparklerPopulated = false;

  function hitZoneSparklerMarkup(isMelodic) {
    const sparks = Array.from({ length: 10 }, (_, i) =>
      `<span class="hold-spark" style="--i:${i}"></span>`
    ).join('');
    return sparks;
  }

  function ensureHitZoneSparkler(isMelodic) {
    const layer = document.getElementById('hit-zone-sparkler');
    if (!layer) return;
    const tone = isMelodic ? 'melodic' : 'percussion';
    if (sparklerPopulated && layer.dataset.tone === tone) return;
    layer.innerHTML = hitZoneSparklerMarkup(isMelodic);
    layer.dataset.tone = tone;
    layer.classList.toggle('melodic', isMelodic);
    layer.classList.toggle('percussion', !isMelodic);
    sparklerPopulated = true;
  }

  function setHitZoneSparklerActive(holding, isMelodic) {
    const hitZone = document.getElementById('hit-zone');
    const layer = document.getElementById('hit-zone-sparkler');
    if (!hitZone || !layer) return;

    hitZone.classList.toggle('melodic', !!holding && isMelodic);
    hitZone.classList.toggle('percussion', !!holding && !isMelodic);

    if (holding) {
      ensureHitZoneSparkler(isMelodic);
      layer.classList.add('active');
    } else {
      layer.classList.remove('active');
      layer.innerHTML = '';
      sparklerPopulated = false;
    }
  }

  function renderHtml(songName) {
    sparklerPopulated = false;
    return `
      <div class="rhythm-highway" id="rhythm-highway">
        <div class="highway-glow"></div>
        <div class="highway-track">
          <div class="highway-grid"></div>
          <div class="hit-zone" id="hit-zone">
            <div class="hit-zone-core"></div>
            <div class="hit-zone-pulse" id="hit-zone-pulse"></div>
            <div class="hit-zone-sparkler" id="hit-zone-sparkler" aria-hidden="true"></div>
          </div>
          <div class="note-lane" id="note-lane"></div>
          <div class="gem-fx-layer" id="gem-fx-layer"></div>
        </div>
        <div class="highway-footer">
          <span class="song-playing">♪ <span id="song-section-label">${songName}</span></span>
          <span class="combo-display" id="combo-display"></span>
        </div>
        <p class="rhythm-hint" id="rhythm-hint">Tap quick gems · hold long gems through the zone!</p>
      </div>`;
  }

  function noteEl(note, headPct, isMelodic, holdingKey) {
    const dur = note.dur || 1;
    const span = 88 - HIT_X;
    const isHold = note.isHold || dur > 1.05;
    const widthPct = isHold
      ? Math.min(span * 0.55, Math.max(10, (dur / LOOKAHEAD) * span * 0.9))
      : Math.min(span * 0.1, Math.max(5, (dur / LOOKAHEAD) * span * 0.48));
    const key = `${note.beat}:${note.chord || ''}:${note.note || ''}:${note.hit || ''}`;
    const isHeld = holdingKey && holdingKey === key;
    const cls = [
      'note-gem',
      note.melodic || isMelodic ? 'melodic' : 'percussion',
      isHold ? 'hold' : 'tap',
      note.active ? 'active' : '',
      isHeld ? 'holding' : '',
    ].filter(Boolean).join(' ');
    const shape = isHold ? '▬' : (note.melodic || isMelodic ? '◇' : '◆');
    return `<div class="${cls}" style="left:${headPct}%;width:${widthPct}%" data-beat="${note.beat}" data-dur="${dur}" data-key="${key}">
      <span class="gem-shape">${shape}</span>
      <span class="gem-label">${note.label}</span>
    </div>`;
  }

  function spawnHoldSpark(isMelodic, hotStreak = false) {
    const layer = document.getElementById('hit-zone-sparkler');
    if (!layer || !layer.classList.contains('active')) return;
    const colors = isMelodic
      ? ['#fff', '#ffd166', '#ffe08a', '#ff6b9d', '#ffb347']
      : ['#fff', '#e8fcff', '#7ee8ff', '#6bcbff', '#ffe08a'];
    const count = (hotStreak ? 4 : 2) + Math.floor(Math.random() * (hotStreak ? 3 : 2));
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = `hold-spark-particle ${isMelodic ? 'melodic' : 'percussion'}${hotStreak ? ' spark-hot' : ''}`;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * (hotStreak ? 1.5 : 1.2);
      const dist = (10 + Math.random() * 22) * (hotStreak ? 1.35 : 1);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const offsetPx = (Math.random() - 0.5) * 16;
      spark.style.left = `calc(50% + ${offsetPx}px)`;
      spark.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
      spark.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
      spark.style.setProperty('--dur', `${0.28 + Math.random() * 0.32}s`);
      spark.style.setProperty('--spark-color', color);
      layer.appendChild(spark);
      setTimeout(() => spark.remove(), 620);
    }
  }

  function spawnBurst(xPct, rating, isMelodic, hotStreak = false) {
    const layer = document.getElementById('gem-fx-layer');
    if (!layer) return;
    const colors = rating === 'perfect'
      ? ['#ffd166', '#fff', '#ff6b9d']
      : isMelodic ? ['#ff6b9d', '#ffb347', '#fff'] : ['#6bcbff', '#7ee8ff', '#fff'];
    const particleCount = hotStreak ? 18 : 10;
    const distScale = hotStreak ? 1.35 : 1;
    const hotCls = hotStreak ? ' burst-hot' : '';
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = `gem-particle burst-${rating}${hotCls}`;
      const ang = (i / particleCount) * Math.PI * 2;
      const dist = (28 + Math.random() * 36) * distScale;
      p.style.left = `${xPct}%`;
      p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
      p.style.background = colors[i % colors.length];
      layer.appendChild(p);
      setTimeout(() => p.remove(), 520);
    }
    const ring = document.createElement('div');
    ring.className = `gem-burst-ring burst-${rating}${hotCls}`;
    ring.style.left = `${xPct}%`;
    layer.appendChild(ring);
    setTimeout(() => ring.remove(), hotStreak ? 550 : 480);
  }

  function explodeGem(note, rating, isMelodic, hotStreak = false) {
    if (!note) return;
    const lane = document.getElementById('note-lane');
    if (!lane) return;
    const key = `${note.beat}:${note.chord || ''}:${note.note || ''}:${note.hit || ''}`;
    const gem = lane.querySelector(`[data-key="${key}"]`) || lane.querySelector(`[data-beat="${note.beat}"]`);
    if (!gem) {
      spawnBurst(HIT_X, rating, isMelodic, hotStreak);
      return;
    }
    const xPct = parseFloat(gem.style.left) || HIT_X;
    gem.classList.add('gem-exploding', `burst-${rating}`);
    spawnBurst(xPct, rating, isMelodic, hotStreak);
    setTimeout(() => gem.remove(), 300);
  }

  function heldNoteEntry(holdNote, elapsed, bpm, isMelodic, leadInBeat = 0, song = null, countdownSec = 4) {
    const beatDur = 60 / bpm;
    const songElapsed = typeof getSongPlayElapsed === 'function'
      ? getSongPlayElapsed(elapsed, countdownSec)
      : Math.max(0, elapsed - countdownSec);
    const hitElapsed = holdNote.hitElapsed ?? (
      typeof noteHitElapsed === 'function'
        ? noteHitElapsed(holdNote, song || {}, leadInBeat, bpm)
        : holdNote.beat * beatDur
    );
    const dur = holdNote.dur || 1;
    const durSec = dur * beatDur;
    const endElapsed = hitElapsed + durSec;
    return {
      ...holdNote,
      beat: holdNote.beat,
      dur,
      endBeat: holdNote.beat + dur,
      endElapsed,
      dist: (hitElapsed - songElapsed) / beatDur,
      distSec: hitElapsed - songElapsed,
      hitElapsed,
      active: songElapsed >= hitElapsed && songElapsed < endElapsed,
      label: holdNote.chord || holdNote.note || holdNote.hit || '•',
      melodic: !!holdNote.chord || !!holdNote.note || isMelodic,
      isHold: true,
    };
  }

  function noteKeyFor(note) {
    return `${note.beat}:${note.chord || ''}:${note.note || ''}:${note.hit || ''}`;
  }

  function update(song, partKey, elapsed, bpm, isMelodic, hitBeats, missedBeats, holdingKey, leadInBeat = 0, heldNote = null, onFire = false, instrument = null, countdownSec = 4) {
    const lane = document.getElementById('note-lane');
    if (!lane) return;

    let notes = getUpcomingNotes(song, partKey, elapsed, bpm, LOOKAHEAD, hitBeats, missedBeats, leadInBeat, instrument, countdownSec);
    if (holdingKey && heldNote && noteKeyFor(heldNote) === holdingKey) {
      const visible = notes.some((n) => noteKeyFor(n) === holdingKey);
      if (!visible) {
        notes.push(heldNoteEntry(heldNote, elapsed, bpm, isMelodic, leadInBeat, song, countdownSec));
        notes.sort((a, b) => a.hitElapsed - b.hitElapsed);
      }
    }
    const beatDur = 60 / bpm;
    const laSec = LOOKAHEAD * beatDur;
    const songElapsed = typeof getSongPlayElapsed === 'function'
      ? getSongPlayElapsed(elapsed, countdownSec)
      : Math.max(0, elapsed - countdownSec);

    lane.innerHTML = notes.map((n) => {
      const distSec = n.distSec ?? (n.hitElapsed - songElapsed);
      const pct = HIT_X + (distSec / laSec) * (88 - HIT_X);
      return noteEl(n, Math.min(92, Math.max(HIT_X - 2, pct)), isMelodic, holdingKey);
    }).join('');

    const pulse = document.getElementById('hit-zone-pulse');
    if (pulse) {
      const near = notes.find((n) => Math.abs(n.distSec ?? 0) < beatDur * 0.12 || n.active);
      pulse.classList.toggle('active', !!near);
    }

    const hitZone = document.getElementById('hit-zone');
    if (hitZone) {
      const inWindow = notes.some((n) => {
        const distSec = Math.abs(n.distSec ?? 0);
        return n.active || distSec < (isMelodic ? beatDur * 0.22 : beatDur * 0.18);
      });
      hitZone.classList.toggle('ready', inWindow);
      hitZone.classList.toggle('holding', !!holdingKey);
    }

    setHitZoneSparklerActive(!!holdingKey, isMelodic);

    if (holdingKey) {
      const now = performance.now();
      if (now - lastHoldSparkAt > (onFire ? 36 : 48)) {
        lastHoldSparkAt = now;
        spawnHoldSpark(isMelodic, onFire);
        if (Math.random() < (onFire ? 0.75 : 0.45)) spawnHoldSpark(isMelodic, onFire);
      }
    } else {
      lastHoldSparkAt = 0;
    }

    const sectionEl = document.getElementById('song-section-label');
    if (sectionEl && song.sections) {
      const sec = getSongSection(song, elapsed, bpm);
      sectionEl.textContent = `${song.name} — ${sec?.name || ''}`;
    }
  }

  function flashHit(rating, hotStreak = false) {
    const zone = document.getElementById('hit-zone');
    if (!zone) return;
    zone.classList.remove('flash-perfect', 'flash-good', 'flash-miss', 'flash-hot');
    void zone.offsetWidth;
    zone.classList.add(`flash-${rating}`);
    if (hotStreak) zone.classList.add('flash-hot');
    zone.classList.add('hit-pop');
    setTimeout(() => {
      zone.classList.remove(`flash-${rating}`);
      zone.classList.remove('hit-pop', 'flash-hot');
    }, hotStreak ? 320 : 280);
  }

  return { renderHtml, update, flashHit, explodeGem, HIT_X, LOOKAHEAD };
})();
