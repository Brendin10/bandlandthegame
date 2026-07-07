const StemPlayer = (() => {
  let song = null;
  let buffers = {};
  let sources = {};
  let gains = {};
  let running = false;
  let startCtxTime = 0;
  let startElapsed = 0;
  let playerStemKey = 'Drums';
  let fullMixVolume = 0.85;
  let playerStemVolume = 1.15;
  let fullMixGain = null;
  let playerStemGain = null;
  let backingGain = null;
  let stemBus = null;
  let sustainSource = null;
  let sustainGain = null;
  let onFullMixEnd = null;
  let lastElapsed = 0;
  let playbackEnded = false;

  const STEM_KEYS = ['Bass', 'Drums', 'Lead', 'Keys', 'Full'];
  const TRACK_STEMS = ['Bass', 'Drums', 'Lead', 'Keys'];
  const HIT_DUCK_MIX = 0.52;
  const HIT_DUCK_SEC = 0.16;

  function getCtx() {
    return AudioEngine.getCtx();
  }

  async function decodeUrl(ac, url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load audio ${url}`);
    const data = await res.arrayBuffer();
    return ac.decodeAudioData(data);
  }

  async function load(songObj, options = {}) {
    stop();
    song = songObj;
    buffers = {};
    playerStemKey = options.playerStemKey !== undefined ? options.playerStemKey : 'Drums';
    fullMixVolume = songObj?.fullMixVolume ?? 0.85;
    playerStemVolume = options.playerStemVolume ?? 1.15;

    if (!song?.stems) return false;
    const ac = getCtx();
    const bust = typeof SONG_ASSET_VERSION !== 'undefined' ? SONG_ASSET_VERSION : '1';
    const loads = STEM_KEYS.map(async (key) => {
      const url = song.stems[key];
      if (!url) return;
      const sep = url.includes('?') ? '&' : '?';
      buffers[key] = await decodeUrl(ac, `${url}${sep}v=${bust}`);
    });
    await Promise.all(loads);
    return isLoaded();
  }

  function ensureBus() {
    const ac = getCtx();
    if (!stemBus) {
      stemBus = ac.createGain();
      stemBus.gain.value = 0.85;
      stemBus.connect(AudioEngine.initMix?.() || ac.destination);
    }
    if (!fullMixGain) {
      fullMixGain = ac.createGain();
      fullMixGain.connect(stemBus);
    }
    if (!playerStemGain) {
      playerStemGain = ac.createGain();
      playerStemGain.connect(stemBus);
    }
    if (!backingGain) {
      backingGain = ac.createGain();
      backingGain.connect(stemBus);
    }
    // The mastered "Full" mix already bakes in the player's own instrument.
    // Playing it audibly alongside the player's hit-triggered slices causes a
    // flam/double-hit, which is exactly what breaks the "you are playing it"
    // feel. So Full stays silent during a gig - it's kept running purely as
    // a timing/completion clock (see startStemSource + setOnFullMixEnd).
    fullMixGain.gain.value = 0;
    // The backing bus carries every stem except the one the player controls,
    // so the band keeps grooving while the player's instrument is heard only
    // when they actually hit/hold a gem. Reuses the song's fullMixVolume
    // tuning knob since it's now the main audible bus during a gig.
    backingGain.gain.value = fullMixVolume;
    playerStemGain.gain.value = playerStemVolume;
    return stemBus;
  }

  function noteTimeSec(note, songObj, bpm) {
    if (note?.timeSec != null) return note.timeSec;
    const beatDur = 60 / bpm;
    return (note.beat * beatDur) + (songObj?.beatOffset || 0);
  }

  function sliceDuration(note, songObj, bpm) {
    const beatDur = 60 / bpm;
    const noteDur = (note.dur || 1) * beatDur;
    if (note.hit === 'kick') return Math.min(noteDur, 0.4);
    if (note.hit === 'snare') return Math.min(noteDur, 0.48);
    if (note.hit) return Math.min(noteDur, 0.32);
    if (note.note || note.chord) return Math.min(Math.max(noteDur, 0.45), 1.1);
    return Math.min(noteDur, 1.25);
  }

  function duckBackingForHit() {
    if (!backingGain) return;
    const ac = getCtx();
    const now = ac.currentTime;
    const g = backingGain.gain;
    const base = fullMixVolume;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    // Quick sidechain-style pump: the backing band dips as the player's own
    // hit lands, so their note reads as the loudest, most present sound in
    // that instant - like the band is genuinely making room for them to play.
    g.linearRampToValueAtTime(base * HIT_DUCK_MIX, now + 0.03);
    g.linearRampToValueAtTime(base, now + HIT_DUCK_SEC);
  }

  function playHit(stemKey, note, songObj, bpm, volScale = 1) {
    const buf = buffers[stemKey];
    if (!buf || !note) return false;

    const ac = getCtx();
    ensureBus();
    const now = ac.currentTime;
    const chartOffset = noteTimeSec(note, songObj, bpm);
    const offset = Math.min(Math.max(chartOffset, 0), Math.max(0, buf.duration - 0.02));
    let duration = sliceDuration(note, songObj, bpm);
    duration = Math.min(duration, buf.duration - offset);
    if (duration <= 0.01) return false;

    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    const vol = (note.hit ? 1.08 : 1.02) * volScale;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.97);
    src.connect(gain);
    gain.connect(playerStemGain);
    src.start(now, offset, duration);
    duckBackingForHit();
    return true;
  }

  function startSustain(stemKey, note, songObj, bpm, volScale = 1) {
    stopSustain();
    const buf = buffers[stemKey];
    if (!buf || !note) return false;

    const ac = getCtx();
    ensureBus();
    const now = ac.currentTime;
    const offset = Math.min(Math.max(noteTimeSec(note, songObj, bpm), 0), Math.max(0, buf.duration - 0.02));
    const beatDur = 60 / bpm;
    let duration = Math.min((note.dur || 1) * beatDur, buf.duration - offset);
    if (duration <= 0.05) return false;

    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    const vol = 0.78 * volScale;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.03);
    src.connect(gain);
    gain.connect(playerStemGain);
    src.start(now, offset, duration);
    sustainSource = src;
    sustainGain = gain;
    return true;
  }

  function stopSustain() {
    if (!sustainSource) return;
    const ac = getCtx();
    const now = ac.currentTime;
    if (sustainGain) {
      try {
        sustainGain.gain.cancelScheduledValues(now);
        sustainGain.gain.setValueAtTime(sustainGain.gain.value, now);
        sustainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      } catch { /* already stopped */ }
    }
    try { sustainSource.stop(now + 0.07); } catch { /* already stopped */ }
    sustainSource = null;
    sustainGain = null;
  }

  function startStemSource(ac, key, offset, startTime) {
    const buf = buffers[key];
    if (!buf) return null;

    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = false;

    const gain = ac.createGain();
    src.connect(gain);

    if (key === 'Full') {
      // Silent by design (see ensureBus) - only used as the timing/completion
      // clock so gig duration + end-of-song detection stay unchanged.
      gain.gain.value = 1;
      gain.connect(fullMixGain);
      src.onended = () => {
        if (sources.Full === src) {
          sources.Full = null;
          const dur = getDuration();
          if (dur > 0) lastElapsed = dur;
          running = false;
          playbackEnded = true;
        }
        onFullMixEnd?.();
      };
    } else {
      // Backing stem: every part except the one the player controls, playing
      // continuously so the rest of the band keeps going.
      gain.gain.value = 1;
      gain.connect(backingGain);
    }

    const safeOffset = Math.min(Math.max(offset, 0), buf.duration);
    src.start(startTime, safeOffset);
    sources[key] = src;
    gains[key] = gain;
    return src;
  }

  function startPerformance(playerStem, audioOffset = 0) {
    if (!song || !buffers.Full) return false;
    stop({ keepSong: true });

    playerStemKey = playerStem ?? playerStemKey;
    const ac = getCtx();
    ensureBus();
    startCtxTime = ac.currentTime + 0.05;
    startElapsed = audioOffset;
    lastElapsed = audioOffset;
    playbackEnded = false;
    running = true;

    const offset = Math.min(Math.max(audioOffset, 0), buffers.Full.duration);
    startStemSource(ac, 'Full', offset, startCtxTime);
    TRACK_STEMS.forEach((key) => {
      if (key === playerStemKey) return;
      startStemSource(ac, key, offset, startCtxTime);
    });

    return true;
  }

  function start(bpm, elapsedOffset = 0) {
    return startPerformance(playerStemKey, elapsedOffset);
  }

  function setPlayerStem(stemKey) {
    playerStemKey = stemKey ?? null;
  }

  function setPlayerStemAudible(audible) {
    if (!playerStemGain) return;
    playerStemGain.gain.value = audible ? playerStemVolume : 0;
  }

  function duckPlayerStem() {
    setPlayerStemAudible(false);
  }

  function getDuration() {
    return buffers.Full?.duration ?? 0;
  }

  function isPlaybackComplete() {
    if (playbackEnded) return true;
    const dur = getDuration();
    if (!dur) return false;
    return getElapsed() >= dur - 0.02;
  }

  function hasPlaybackEnded() {
    return playbackEnded;
  }

  function getElapsed() {
    if (running) {
      const ac = getCtx();
      let elapsed = startElapsed + Math.max(0, ac.currentTime - startCtxTime);
      const dur = getDuration();
      if (dur > 0) elapsed = Math.min(elapsed, dur);
      lastElapsed = elapsed;
      return elapsed;
    }
    return lastElapsed;
  }

  function seek(audioOffset) {
    if (!running || !song) return false;
    const stem = playerStemKey;
    const bpm = song.bpm || 120;
    startPerformance(stem, audioOffset);
    return true;
  }

  function stop(options = {}) {
    const preserveProgress = options.preserveProgress === true;
    running = false;
    if (!preserveProgress) {
      playbackEnded = false;
      lastElapsed = 0;
    }
    stopSustain();
    Object.values(sources).forEach((src) => {
      try {
        src.onended = null;
        src.stop();
      } catch { /* already stopped */ }
    });
    sources = {};
    gains = {};
    if (!options.keepSong) {
      song = null;
      buffers = {};
    }
  }

  function isRunning() {
    return running;
  }

  function hasFullMix() {
    return !!buffers.Full;
  }

  function hasStem(stemKey) {
    return !!buffers[stemKey];
  }

  function isLoaded() {
    return hasFullMix() && hasStem(playerStemKey);
  }

  function hasStems() {
    return STEM_KEYS.some((key) => key !== 'Full' && buffers[key]);
  }

  function setOnFullMixEnd(cb) {
    onFullMixEnd = typeof cb === 'function' ? cb : null;
  }

  return {
    load,
    start,
    startPerformance,
    stop,
    playHit,
    startSustain,
    stopSustain,
    setPlayerStem,
    setPlayerStemAudible,
    duckPlayerStem,
    seek,
    getElapsed,
    getDuration,
    isPlaybackComplete,
    hasPlaybackEnded,
    isRunning,
    hasStems,
    hasFullMix,
    hasStem,
    isLoaded,
    setOnFullMixEnd,
  };
})();
