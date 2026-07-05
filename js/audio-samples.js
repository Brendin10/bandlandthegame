const AudioSamples = (() => {
  const BASE = 'audio/instruments/';
  const INSTRUMENT_AUDIO_V = 2;
  const INSTRUMENT_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a'];

  const SUBTYPE_SAMPLES = {
    electric: ['electric-strum.wav'],
    acoustic: ['acoustic-strum.wav'],
    ukulele: ['ukulele-strum.wav'],
    bass: ['bass-pluck.wav'],
    banjo: ['acoustic-strum.wav'],
    bow: ['acoustic-strum.wav'],
    piano: ['piano-chord.wav'],
    synth: ['keyboard-chord.wav'],
    organ: ['organ-chord.wav'],
    accordion: ['piano-chord.wav'],
    brass: ['brass-note.wav'],
    sax: ['sax-note.wav'],
    flute: ['brass-note.wav'],
    clarinet: ['brass-note.wav'],
    harmonica: ['brass-note.wav'],
    mallet: ['bell-hit.wav'],
    drums: ['drum-kick.wav', 'drum-snare.wav', 'drum-hihat.wav'],
    cymbal: ['cymbal-hit.wav'],
    shake: ['shake.wav'],
    bell: ['bell-hit.wav'],
    triangle: ['bell-hit.wav'],
    bongo: ['drum-snare.wav'],
  };

  const cache = new Map();
  const loading = new Map();
  const instrumentCache = new Map();
  const instrumentLoading = new Map();
  let hitCounter = 0;

  function getCtx() {
    return AudioEngine.getCtx();
  }

  async function resumeCtx() {
    const ac = getCtx();
    if (ac.state === 'suspended') await ac.resume();
    return ac;
  }

  async function decodeAudioBuffer(ac, buf) {
    const copy = buf.slice(0);
    return ac.decodeAudioData(copy);
  }

  function sampleUrl(name) {
    return `${BASE}${name}`;
  }

  function instrumentSampleUrl(instId, ext) {
    return `${BASE}${instId}.${ext}?v=${INSTRUMENT_AUDIO_V}`;
  }

  function loadBuffer(name) {
    if (cache.has(name)) return Promise.resolve(cache.get(name));
    if (loading.has(name)) return loading.get(name);

    const ac = getCtx();
    const promise = fetch(sampleUrl(name))
      .then((r) => {
        if (!r.ok) throw new Error(`sample ${name} ${r.status}`);
        return r.arrayBuffer();
      })
      .then((buf) => decodeAudioBuffer(ac, buf))
      .then((decoded) => {
        cache.set(name, decoded);
        loading.delete(name);
        return decoded;
      })
      .catch((err) => {
        loading.delete(name);
        console.warn('Instrument sample load failed', name, err);
        return null;
      });

    loading.set(name, promise);
    return promise;
  }

  function loadInstrumentSample(instId) {
    if (!instId) return Promise.resolve(null);
    if (instrumentCache.has(instId)) return Promise.resolve(instrumentCache.get(instId));
    if (instrumentLoading.has(instId)) return instrumentLoading.get(instId);

    const promise = (async () => {
      const ac = await resumeCtx();
      for (const ext of INSTRUMENT_EXTENSIONS) {
        try {
          const r = await fetch(instrumentSampleUrl(instId, ext), { cache: 'no-store' });
          if (!r.ok) continue;
          const buf = await r.arrayBuffer();
          const decoded = await decodeAudioBuffer(ac, buf);
          instrumentCache.set(instId, decoded);
          instrumentLoading.delete(instId);
          return decoded;
        } catch (err) {
          console.warn(`Instrument sample unavailable: ${instId}.${ext}`, err);
        }
      }
      instrumentLoading.delete(instId);
      return null;
    })();

    instrumentLoading.set(instId, promise);
    return promise;
  }

  async function ensureInstrumentSample(instId) {
    if (!instId) return null;
    return loadInstrumentSample(instId);
  }

  async function loadInstrumentSamples(subtype, instId = null) {
    const loads = [];
    if (subtype) {
      const names = SUBTYPE_SAMPLES[subtype] || [];
      loads.push(...names.map(loadBuffer));
    }
    if (instId) loads.push(loadInstrumentSample(instId));
    const results = await Promise.all(loads);
    return results.filter(Boolean);
  }

  function hasInstrumentSample(instId) {
    return !!(instId && instrumentCache.has(instId));
  }

  function pickSample(subtype, noteEvent, instId = null) {
    if (instId && instrumentCache.has(instId)) {
      return instrumentCache.get(instId);
    }
    const names = SUBTYPE_SAMPLES[subtype] || [];
    if (!names.length) return null;
    if (subtype === 'drums' && noteEvent?.hit) {
      const hitMap = { kick: 'drum-kick.wav', snare: 'drum-snare.wav', hihat: 'drum-hihat.wav' };
      const hitName = hitMap[noteEvent.hit];
      if (hitName && cache.has(hitName)) return cache.get(hitName);
    }
    hitCounter += 1;
    const name = names[hitCounter % names.length];
    return cache.get(name) || null;
  }

  function playInstrumentSample(subtype, noteEvent, vol = 0.55, instId = null) {
    const usedCustom = !!(instId && instrumentCache.has(instId));
    const buffer = pickSample(subtype, noteEvent, instId);
    if (!buffer) return false;

    const ac = getCtx();
    const now = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = buffer;
    const g = ac.createGain();
    const pitch = usedCustom ? 1 : 0.96 + Math.random() * 0.08;
    src.playbackRate.value = pitch;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + Math.min(buffer.duration * 0.9, 0.8));
    src.connect(g);
    AudioEngine.connectToMix(g, (Math.random() - 0.5) * 0.3, noteEvent?.hit ? 'perc' : 'music');
    src.start(now);
    return usedCustom ? 'custom' : true;
  }

  function preloadCommon() {
    const common = ['electric-strum.wav', 'drum-kick.wav', 'drum-snare.wav', 'piano-chord.wav', 'cymbal-hit.wav'];
    return Promise.all(common.map(loadBuffer));
  }

  return {
    loadBuffer,
    loadInstrumentSample,
    ensureInstrumentSample,
    loadInstrumentSamples,
    playInstrumentSample,
    preloadCommon,
    hasInstrumentSample,
    hasSample(subtype) {
      return !!(SUBTYPE_SAMPLES[subtype]?.length);
    },
  };
})();
