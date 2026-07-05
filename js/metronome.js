const Metronome = (() => {
  let bpm = 100;
  let startTime = 0;
  let running = false;
  let rafId = null;
  let onBeat = null;
  let lastBeat = -1;
  let silent = false;
  let beatSuspended = false;

  function start(bpmVal, beatCallback, options = {}) {
    bpm = bpmVal;
    onBeat = beatCallback;
    startTime = performance.now();
    running = true;
    lastBeat = -1;
    silent = !!options.silent;
    loop();
  }

  function setBeatSuspended(v) {
    beatSuspended = !!v;
  }

  function loop() {
    if (!running) return;
    if (beatSuspended) {
      rafId = requestAnimationFrame(loop);
      return;
    }
    const elapsed = (performance.now() - startTime) / 1000;
    const beatDur = 60 / bpm;
    const beatIdx = Math.floor(elapsed / beatDur);
    if (beatIdx !== lastBeat) {
      lastBeat = beatIdx;
      onBeat?.(beatIdx);
      if (!silent) AudioEngine.playTick?.(0.08);
    }
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  function getPhase() {
    if (!running) return 0;
    const elapsed = (performance.now() - startTime) / 1000;
    return (elapsed % (60 / bpm)) / (60 / bpm);
  }

  function getBeatDistance() {
    const phase = getPhase();
    return Math.min(phase, 1 - phase) * (60 / bpm);
  }

  function ratePercussionHit() {
    const dist = getBeatDistance();
    if (dist <= 0.12) return 'perfect';
    if (dist <= 0.22) return 'good';
    return 'miss';
  }

  function getElapsed() {
    return running ? (performance.now() - startTime) / 1000 : 0;
  }

  function seek(elapsedSec) {
    if (!running) return;
    const beatDur = 60 / bpm;
    startTime = performance.now() - elapsedSec * 1000;
    lastBeat = Math.floor(elapsedSec / beatDur) - 1;
  }

  return {
    start, stop, seek, setBeatSuspended, getPhase, getBeatDistance, ratePercussionHit, getElapsed,
    get bpm() { return bpm; },
    get running() { return running; },
  };
})();

function getTuneState(instrument, bpm, elapsed) {
  const progression = instrument.progression || ['C', 'G', 'Am', 'F'];
  const barDur = (60 / bpm) * 2;
  const idx = Math.floor(elapsed / barDur) % progression.length;
  const phase = (elapsed % barDur) / barDur;
  const inTune = phase >= 0.38 && phase <= 0.62;
  return { chord: progression[idx], phase, inTune, idx };
}

function rateMelodicHit(instrument, bpm, elapsed) {
  const tune = getTuneState(instrument, bpm, elapsed);
  if (!tune.inTune) return 'miss';
  const beatDist = Metronome.getBeatDistance();
  if (beatDist <= 0.18) return 'perfect';
  if (beatDist <= 0.28) return 'good';
  return 'miss';
}
