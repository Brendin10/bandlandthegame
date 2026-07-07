const AudioEngine = (() => {
  let ctx = null;
  let mixReady = false;
  let musicBus = null;
  let percBus = null;
  let dryGain = null;
  let wetGain = null;
  let crowdBus = null;
  let masterVolumeGain = null;
  let masterVolumeValue = 1;
  let reverbSend = null; // was previously assigned without a declaration in initMix(), leaking an implicit global

  const CHORD_ROOT = {
    C: 'C2', G: 'G1', Am: 'A1', F: 'F1', E: 'E2', B: 'B1',
    'C#m': 'C#2', A: 'A1', D: 'D2', Em: 'E2', Dm: 'D2',
  };

  const NOTE_FREQ = {
    E2: 82.41, A1: 55.0, B1: 61.74, C2: 65.41, 'C#2': 69.3, D2: 73.42,
    G1: 49.0, F1: 43.65, G2: 98.0, G4: 392.0, A4: 440.0, C5: 523.25,
    D5: 587.33, F5: 698.46, E4: 329.63, F4: 349.23, B4: 493.88,
    'F#5': 739.99, 'D#5': 622.25,
  };

  const CHORD_FREQS = {
    C: [261.63, 329.63, 392.0],
    G: [392.0, 493.88, 587.33],
    Am: [220.0, 261.63, 329.63],
    F: [174.61, 220.0, 261.63],
    E: [329.63, 415.3, 493.88],
    B: [246.94, 311.13, 369.99],
    'C#m': [277.18, 329.63, 415.3],
    A: [220.0, 277.18, 329.63],
    D: [293.66, 369.99, 440.0],
    Em: [164.81, 196.0, 246.94],
    Dm: [146.83, 174.61, 220.0],
    Bb: [233.08, 293.66, 349.23],
    Bm: [246.94, 293.66, 369.99],
    Eb: [311.13, 392.0, 466.16],
  };

  const ROLE_SUBTYPE = {
    Lead: 'electric',
    Guitar: 'electric',
    Bass: 'bass',
    Keys: 'piano',
    Drums: 'drums',
    drums: 'drums',
    bass: 'bass',
    keys: 'piano',
    'electric-guitar': 'electric',
    'trash-lid': 'cymbal',
  };

  let activeSustain = null;

  const VOLUME_KEY = 'bandland_audio_volume';

  function loadStoredVolume() {
    try {
      const raw = localStorage.getItem(VOLUME_KEY);
      if (raw === null) return 1;
      const v = parseFloat(raw);
      if (Number.isNaN(v)) return 1;
      return Math.max(0, Math.min(1, v));
    } catch {
      return 1;
    }
  }

  function storeVolume(v) {
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      /* ignore */
    }
  }

  masterVolumeValue = loadStoredVolume();

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function resume() {
    const ac = getCtx();
    if (ac.state === 'suspended') return ac.resume().then(() => ac);
    return Promise.resolve(ac);
  }

  let silentUnlockAudio = null;

  // Fix for: "no sound on iPhone even with volume up / mute switch aside".
  // Safari puts raw Web Audio API output in the "ambient" audio session
  // category by default, which the physical mute switch silences — separate
  // from the ringer/media volume, and separate from resuming the AudioContext
  // (resume() just un-suspends processing, it doesn't change the session
  // category). Playing any real <audio>/<video> element switches the page's
  // session to "playback", which iOS does not mute with the switch, and every
  // other Web Audio node on the page starts being heard too. We generate a
  // tiny silent WAV in memory (no network request, no asset needed) and loop
  // it forever once, started from the same user gesture that unlocks audio.
  function unlockIOSAudioSession() {
    if (silentUnlockAudio) return;
    try {
      const sampleRate = 8000;
      const numSamples = 800; // 0.1s of silence
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);
      const writeStr = (offset, str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true); // byte rate
      view.setUint16(32, 2, true); // block align
      view.setUint16(34, 16, true); // bits per sample
      writeStr(36, 'data');
      view.setUint32(40, numSamples * 2, true);
      // Sample bytes are already zero-initialized by ArrayBuffer — true silence.

      const blob = new Blob([buffer], { type: 'audio/wav' });
      const audio = new Audio();
      audio.src = URL.createObjectURL(blob);
      audio.loop = true;
      audio.preload = 'auto';
      audio.setAttribute('playsinline', '');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      const playResult = audio.play();
      if (playResult?.catch) playResult.catch(() => {});
      silentUnlockAudio = audio;
    } catch (err) {
      console.warn('iOS silent-switch audio unlock failed', err);
    }
  }

  function initMix() {
    if (mixReady) return musicBus;
    const ac = getCtx();
    musicBus = ac.createGain();
    musicBus.gain.value = 1;
    percBus = ac.createGain();
    percBus.gain.value = 1;
    dryGain = ac.createGain();
    dryGain.gain.value = 0.9;
    wetGain = ac.createGain();
    wetGain.gain.value = 0.2;
    reverbSend = ac.createGain();
    reverbSend.gain.value = 0.3;

    const delay = ac.createDelay(0.5);
    delay.delayTime.value = 0.12;
    const delayFilter = ac.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 2000;
    const delayFeedback = ac.createGain();
    delayFeedback.gain.value = 0.26;

    musicBus.connect(dryGain);
    musicBus.connect(reverbSend);
    reverbSend.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delay);
    delayFilter.connect(wetGain);

    percBus.connect(dryGain);

    crowdBus = ac.createGain();
    crowdBus.gain.value = 0.64;

    masterVolumeGain = ac.createGain();
    masterVolumeGain.gain.value = masterVolumeValue;
    masterVolumeGain.connect(ac.destination);

    crowdBus.connect(masterVolumeGain);
    dryGain.connect(masterVolumeGain);
    wetGain.connect(masterVolumeGain);
    mixReady = true;
    return musicBus;
  }

  function setMasterVolume(v) {
    const clamped = Math.max(0, Math.min(1, v));
    masterVolumeValue = clamped;
    storeVolume(clamped);
    if (masterVolumeGain) {
      const ac = getCtx();
      masterVolumeGain.gain.setTargetAtTime(clamped, ac.currentTime, 0.01);
    }
  }

  function getMasterVolume() {
    return masterVolumeValue;
  }

  function getMix() {
    return initMix();
  }

  function connectToMix(node, pan = 0, bus = 'music') {
    initMix();
    const target = bus === 'perc' ? percBus : musicBus;
    if (pan !== 0) {
      const ac = getCtx();
      const p = ac.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      p.connect(target);
      return p;
    }
    node.connect(target);
    return node;
  }

  function masterGain(ac, now, peak, dur, pan = 0, bus = 'music') {
    const g = ac.createGain();
    g.gain.setValueAtTime(peak, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    connectToMix(g, pan, bus);
    return g;
  }

  function playKick(ac, now, vol = 0.55) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
    const g = masterGain(ac, now, vol, 0.28, 0, 'perc');
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.26);

    const click = ac.createOscillator();
    click.type = 'sine';
    click.frequency.value = 1100;
    const cg = masterGain(ac, now, 0.07, 0.012, 0, 'perc');
    click.connect(cg);
    click.start(now);
    click.stop(now + 0.02);
  }

  function playSnare(ac, now, vol = 0.35) {
    const tone = ac.createOscillator();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(240, now);
    tone.frequency.exponentialRampToValueAtTime(130, now + 0.09);
    const tg = masterGain(ac, now, vol * 0.6, 0.11, 0.04, 'perc');
    tone.connect(tg);
    tone.start(now);
    tone.stop(now + 0.1);

    const click = ac.createOscillator();
    click.type = 'square';
    click.frequency.value = 850;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 1;
    const cg = masterGain(ac, now, vol * 0.22, 0.035, -0.04, 'perc');
    click.connect(bp);
    bp.connect(cg);
    click.start(now);
    click.stop(now + 0.04);
  }

  function playHihat(ac, now, vol = 0.14) {
    [4100, 6600, 9200].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 4500;
      const g = masterGain(ac, now + i * 0.001, vol * 0.32, 0.035, 0, 'perc');
      osc.connect(hp);
      hp.connect(g);
      osc.start(now + i * 0.001);
      osc.stop(now + 0.04);
    });
  }

  function playCymbal(ac, now, vol = 0.28) {
    const ratios = [1, 1.48, 2.05, 2.78, 3.55, 4.4];
    const base = 320;
    ratios.forEach((r, i) => {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      const f = base * r;
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.5, now + 0.38);
      const g = ac.createGain();
      const t = now + i * 0.003;
      g.gain.setValueAtTime(vol * 0.13, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      connectToMix(g, (i - 2.5) * 0.07, 'perc');
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  function playShake(ac, now, vol = 0.2) {
    [2600, 3400, 4200, 5000].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const g = masterGain(ac, now + i * 0.006, vol * 0.28, 0.06, (i - 1.5) * 0.12, 'perc');
      osc.connect(g);
      osc.start(now + i * 0.006);
      osc.stop(now + 0.07);
    });
  }

  function playBassNote(ac, now, note, vol = 0.22) {
    const freq = NOTE_FREQ[note] || 82.41;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const osc2 = ac.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2;
    const g = masterGain(ac, now, vol, 0.35, 0, 'music');
    const g2 = masterGain(ac, now, vol * 0.25, 0.2, 0, 'music');
    osc.connect(g);
    osc2.connect(g2);
    osc.start(now);
    osc.stop(now + 0.36);
    osc2.start(now);
    osc2.stop(now + 0.22);
  }

  function playPluck(ac, now, freqs, vol = 0.14, bright = false) {
    freqs.forEach((freq, i) => {
      const delay = i * 0.008;
      const len = Math.floor(ac.sampleRate * 0.35);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let s = 0; s < len; s++) {
        d[s] = Math.sin(2 * Math.PI * freq * s / ac.sampleRate) * (1 - s / len) ** (bright ? 1.2 : 1.6);
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = bright ? 4200 : 2800;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, now + delay);
      g.gain.linearRampToValueAtTime(vol, now + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.45);
      connectToMix(g, 0, 'music');
      src.connect(lp);
      lp.connect(g);
      src.start(now + delay);
    });
  }

  function playChord(ac, now, chordName, vol = 0.13, power = false) {
    playPluck(ac, now, CHORD_FREQS[chordName] || CHORD_FREQS.C, vol, power);
  }

  function resolveSubtype(roleOrInst) {
    if (!roleOrInst) return 'generic';
    if (typeof roleOrInst === 'object') {
      return roleOrInst.subtype || ROLE_SUBTYPE[roleOrInst.id] || 'generic';
    }
    if (ROLE_SUBTYPE[roleOrInst]) return ROLE_SUBTYPE[roleOrInst];
    if (typeof INSTRUMENTS !== 'undefined' && INSTRUMENTS[roleOrInst]) {
      return INSTRUMENTS[roleOrInst].subtype;
    }
    return roleOrInst;
  }

  function chordFreqs(chordName) {
    return CHORD_FREQS[chordName] || CHORD_FREQS.C;
  }

  function addVibrato(ac, osc, now, rate = 5.5, depth = 4) {
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = rate;
    lfoGain.gain.value = depth;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + 3);
    return lfo;
  }

  function playUkulele(ac, now, chordName, vol = 1) {
    chordFreqs(chordName).forEach((freq, i) => {
      const t = now + i * 0.012;
      const len = Math.floor(ac.sampleRate * 0.28);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let s = 0; s < len; s++) {
        const env = (1 - s / len) ** 2.2;
        d[s] = Math.sin(2 * Math.PI * freq * s / ac.sampleRate) * env;
        d[s] += Math.sin(2 * Math.PI * freq * 2 * s / ac.sampleRate) * env * 0.15;
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1800 + i * 200;
      bp.Q.value = 1.2;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16 * vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      connectToMix(g, i === 0 ? -0.2 : i === 2 ? 0.2 : 0, 'music');
      src.connect(bp);
      bp.connect(g);
      src.start(t);
    });
  }

  function playElectricGuitar(ac, now, chordName, vol = 1) {
    chordFreqs(chordName).forEach((freq, i) => {
      const pan = i === 0 ? -0.3 : i === 2 ? 0.3 : 0;
      [freq, freq * 1.005].forEach((f, j) => {
        const osc = ac.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        const drive = ac.createWaveShaper();
        const curve = new Float32Array(256);
        for (let k = 0; k < 256; k++) {
          const x = (k / 128) - 1;
          curve[k] = Math.tanh(x * 2.8);
        }
        drive.curve = curve;
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(3800, now);
        lp.frequency.exponentialRampToValueAtTime(900, now + 0.42);
        const g = ac.createGain();
        const t = now + i * 0.006 + j * 0.002;
        const peak = 0.075 * vol;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(drive);
        drive.connect(lp);
        lp.connect(g);
        connectToMix(g, pan + (j ? 0.04 : 0), 'music');
        osc.start(t);
        osc.stop(t + 0.52);
      });
    });
  }

  function playAcousticGuitar(ac, now, chordName, vol = 1) {
    chordFreqs(chordName).forEach((freq, i) => {
      const len = Math.floor(ac.sampleRate * 0.5);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let s = 0; s < len; s++) {
        const env = (1 - s / len) ** 1.4;
        d[s] = Math.sin(2 * Math.PI * freq * s / ac.sampleRate) * env;
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3200;
      const g = ac.createGain();
      const t = now + i * 0.018;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14 * vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      connectToMix(g, i === 0 ? -0.15 : 0.15, 'music');
      src.connect(lp);
      lp.connect(g);
      src.start(t);
    });
  }

  function playBanjo(ac, now, chordName, vol = 1) {
    const freqs = chordFreqs(chordName).map((f) => f * 2);
    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 8;
      const g = ac.createGain();
      const t = now + i * 0.01;
      g.gain.setValueAtTime(0.18 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      connectToMix(g, 0, 'music');
      osc.connect(bp);
      bp.connect(g);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  function playPiano(ac, now, chordName, vol = 1) {
    chordFreqs(chordName).forEach((freq, i) => {
      const t = now + i * 0.014;
      [1, 2, 3].forEach((harm, hi) => {
        const osc = ac.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq * harm;
        const g = ac.createGain();
        const peak = (0.09 - hi * 0.02) * vol;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.55 + hi * 0.1);
        connectToMix(g, 0, 'music');
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.7);
      });
    });
  }

  function playOrgan(ac, now, chordName, vol = 1) {
    chordFreqs(chordName).forEach((freq, i) => {
      [1, 2, 0.5].forEach((ratio, ri) => {
        const osc = ac.createOscillator();
        osc.type = ri === 2 ? 'square' : 'sine';
        osc.frequency.value = freq * ratio;
        const g = ac.createGain();
        const t = now + i * 0.01;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05 * vol, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        connectToMix(g, (i - 1) * 0.12, 'music');
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.68);
      });
    });
  }

  function playSynth(ac, now, chordName, vol = 1, lead = false) {
    const freqs = lead ? [chordFreqs(chordName)[0] * 2] : chordFreqs(chordName);
    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = lead ? 'square' : 'sawtooth';
      osc.frequency.value = freq;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(lead ? 2400 : 1800, now);
      lp.frequency.exponentialRampToValueAtTime(lead ? 900 : 600, now + 0.35);
      const g = ac.createGain();
      const t = now + i * 0.008;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1 * vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + (lead ? 0.28 : 0.45));
      connectToMix(g, lead ? 0 : (i - 1) * 0.15, 'music');
      osc.connect(lp);
      lp.connect(g);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  function playBrass(ac, now, noteOrChord, vol = 1, trombone = false) {
    const freq = typeof noteOrChord === 'string' && NOTE_FREQ[noteOrChord]
      ? NOTE_FREQ[noteOrChord]
      : chordFreqs(noteOrChord)[0] * (trombone ? 0.5 : 1);
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq * 0.98, now);
    osc.frequency.linearRampToValueAtTime(freq * 1.02, now + 0.15);
    addVibrato(ac, osc, now, 5, 3);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = trombone ? 600 : 1200;
    bp.Q.value = trombone ? 1.5 : 2.5;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12 * vol, now + 0.04);
    g.gain.setValueAtTime(0.1 * vol, now + 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    connectToMix(g, 0, 'music');
    osc.connect(bp);
    bp.connect(g);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  function playSax(ac, now, noteOrChord, vol = 1) {
    const freq = typeof noteOrChord === 'string' && NOTE_FREQ[noteOrChord]
      ? NOTE_FREQ[noteOrChord]
      : chordFreqs(noteOrChord)[0];
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    addVibrato(ac, osc, now, 6, 5);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.11 * vol, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    connectToMix(g, 0, 'music');
    osc.connect(lp);
    lp.connect(g);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  function playBow(ac, now, chordName, vol = 1) {
    const freq = chordFreqs(chordName)[0] * 2;
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    addVibrato(ac, osc, now, 7, 6);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.1 * vol, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    connectToMix(g, 0, 'music');
    osc.connect(lp);
    lp.connect(g);
    osc.start(now);
    osc.stop(now + 0.52);
  }

  function playFlute(ac, now, noteOrChord, vol = 1) {
    const freq = typeof noteOrChord === 'string' && NOTE_FREQ[noteOrChord]
      ? NOTE_FREQ[noteOrChord]
      : chordFreqs(noteOrChord)[0] * 2;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    addVibrato(ac, osc, now, 5.5, 4);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.09 * vol, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    connectToMix(g, 0, 'music');
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  function playClarinet(ac, now, chordName, vol = 1) {
    const freq = chordFreqs(chordName)[0];
    [1, 3, 5].forEach((harm, i) => {
      const osc = ac.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq * harm;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1600;
      const g = ac.createGain();
      const t = now + i * 0.01;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime((0.08 - i * 0.015) * vol, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      connectToMix(g, 0, 'music');
      osc.connect(lp);
      lp.connect(g);
      osc.start(t);
      osc.stop(t + 0.42);
    });
  }

  function playHarmonica(ac, now, chordName, vol = 1) {
    const freq = chordFreqs(chordName)[0] * 2;
    [freq, freq * 1.01].forEach((f, i) => {
      const osc = ac.createOscillator();
      osc.type = 'square';
      osc.frequency.value = f;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 3;
      const g = ac.createGain();
      const t = now + i * 0.005;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.08 * vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      connectToMix(g, 0, 'music');
      osc.connect(bp);
      bp.connect(g);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }

  function playAccordion(ac, now, chordName, vol = 1) {
    chordFreqs(chordName).forEach((freq, i) => {
      [freq, freq * 1.008].forEach((f, j) => {
        const osc = ac.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        const g = ac.createGain();
        const t = now + i * 0.02 + j * 0.003;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06 * vol, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        connectToMix(g, (i - 1) * 0.2, 'music');
        osc.connect(g);
        osc.start(t);
        osc.stop(t + 0.52);
      });
    });
  }

  function playMallet(ac, now, chordName, vol = 1) {
    chordFreqs(chordName).forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * 2;
      const g = ac.createGain();
      const t = now + i * 0.04;
      g.gain.setValueAtTime(0.14 * vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      connectToMix(g, (i - 1) * 0.25, 'music');
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  function playBellHit(ac, now, vol = 0.2) {
    [880, 1320, 1760].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ac.createGain();
      const t = now + i * 0.002;
      g.gain.setValueAtTime(vol * 0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      connectToMix(g, 0, 'perc');
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.62);
    });
  }

  function playTriangleHit(ac, now, vol = 0.16) {
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 2800;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    connectToMix(g, 0, 'perc');
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 1.25);
  }

  function playMelodicBySubtype(ac, now, subtype, chordOrNote, vol = 1, instId = '') {
    switch (subtype) {
      case 'ukulele': playUkulele(ac, now, chordOrNote, vol); break;
      case 'electric': playElectricGuitar(ac, now, chordOrNote, vol); break;
      case 'acoustic': playAcousticGuitar(ac, now, chordOrNote, vol); break;
      case 'banjo': playBanjo(ac, now, chordOrNote, vol); break;
      case 'piano': playPiano(ac, now, chordOrNote, vol); break;
      case 'organ': playOrgan(ac, now, chordOrNote, vol); break;
      case 'synth': playSynth(ac, now, chordOrNote, vol, instId === 'synth-lead'); break;
      case 'brass': playBrass(ac, now, chordOrNote, vol, instId === 'trombone'); break;
      case 'sax': playSax(ac, now, chordOrNote, vol); break;
      case 'bow': playBow(ac, now, chordOrNote, vol); break;
      case 'flute': playFlute(ac, now, chordOrNote, vol); break;
      case 'clarinet': playClarinet(ac, now, chordOrNote, vol); break;
      case 'harmonica': playHarmonica(ac, now, chordOrNote, vol); break;
      case 'accordion': playAccordion(ac, now, chordOrNote, vol); break;
      case 'mallet': playMallet(ac, now, chordOrNote, vol); break;
      case 'bass': playBassNote(ac, now, chordOrNote, 0.28 * vol); break;
      default: playPluck(ac, now, typeof chordOrNote === 'string' && NOTE_FREQ[chordOrNote]
        ? [NOTE_FREQ[chordOrNote]]
        : chordFreqs(chordOrNote), 0.14 * vol);
    }
  }

  function startSustain(inst, note) {
    stopSustain();
    const ac = getCtx();
    const now = ac.currentTime;
    const subtype = resolveSubtype(inst);
    const instId = typeof inst === 'object' ? inst.id : '';
    const freqs = note.chord
      ? chordFreqs(note.chord)
      : [NOTE_FREQ[note.note] || 440];
    const master = ac.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.08, now + 0.04);
    connectToMix(master, 0, 'music');
    const nodes = [];
    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = subtype === 'electric' ? 'sawtooth' : subtype === 'bow' || subtype === 'sax' ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      if (subtype === 'bow' || subtype === 'sax' || subtype === 'flute' || subtype === 'brass') {
        addVibrato(ac, osc, now, 5.5, 4);
      }
      const lp = ac.createGain();
      lp.gain.value = 0.35 / freqs.length;
      osc.connect(lp);
      lp.connect(master);
      osc.start(now);
      nodes.push(osc);
    });
    activeSustain = { master, nodes, ac };
  }

  function stopSustain() {
    if (!activeSustain) return;
    const { master, nodes, ac } = activeSustain;
    const now = ac.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    nodes.forEach((n) => { try { n.stop(now + 0.1); } catch (_) {} });
    activeSustain = null;
  }

  function playGuitarChord(ac, now, chordName, vol = 1) {
    playElectricGuitar(ac, now, chordName, vol);
  }

  function playKeysChord(ac, now, chordName) {
    playPiano(ac, now, chordName, 0.85);
  }

  function playHornNote(ac, now, note, vol = 0.1) {
    playBrass(ac, now, note, vol);
  }

  function playVocal(ac, now, style = 'ooh') {
    const base = style === 'ah' ? 440 : 523;
    [base, base * 1.25].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 900 + i * 200;
      bp.Q.value = 4;
      const g = ac.createGain();
      const t = now + i * 0.02;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      connectToMix(g, 0, 'music');
      osc.connect(bp);
      bp.connect(g);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  }

  function playDrumStyleBeat(ac, now, beatIdx, drumStyle, intensity = 1) {
    const b = beatIdx % 4;
    const v = intensity;
    if (drumStyle === 'ska') {
      if (b === 0) playKick(ac, now, 0.55 * v);
      if (b === 2) playSnare(ac, now, 0.38 * v);
      if (b % 2 === 1) playHihat(ac, now, 0.14 * v);
    } else if (drumStyle === 'swing') {
      if (b === 0) playKick(ac, now, 0.55 * v);
      if (b === 2) playSnare(ac, now, 0.38 * v);
      if (b === 3) playHihat(ac, now, 0.14 * v);
    } else if (drumStyle === 'latin') {
      if (b === 0) playKick(ac, now, 0.55 * v);
      if (b === 1) playSnare(ac, now, 0.36 * v);
      if (b % 2 === 0) playHihat(ac, now, 0.13 * v);
    } else if (drumStyle === 'drive') {
      if (b === 0) playKick(ac, now, 0.62 * v);
      if (b === 2) playSnare(ac, now, 0.4 * v);
      if (intensity > 0.7 && b % 2 === 1) playHihat(ac, now, 0.14 * v);
    } else {
      if (b === 0) playKick(ac, now, 0.58 * v);
      if (b === 2) playSnare(ac, now, 0.38 * v);
      if (intensity > 0.5 && b % 2 === 1) playHihat(ac, now, 0.13 * v);
    }
    if (typeof AudioSamples !== 'undefined') {
      const hit = b === 0 ? { hit: 'kick' } : b === 2 ? { hit: 'snare' } : b % 2 === 1 ? { hit: 'hihat' } : null;
      if (hit) AudioSamples.playInstrumentSample('drums', hit, 0.22 * v);
    }
  }

  async function playPartEvent(event, roleOrInst, volScale = 1) {
    const ac = getCtx();
    const now = ac.currentTime;
    const v = volScale;
    const subtype = resolveSubtype(roleOrInst);
    const instId = typeof roleOrInst === 'object' ? roleOrInst.id : null;
    if (instId && typeof AudioSamples !== 'undefined') {
      await AudioSamples.ensureInstrumentSample(instId);
    }
    const sampleVol = v * 0.65;

    if (event.chord) {
      let sampleResult = false;
      if (typeof AudioSamples !== 'undefined') {
        sampleResult = AudioSamples.playInstrumentSample(subtype, event, sampleVol, instId);
      }
      const customSample = sampleResult === 'custom'
        || (instId && typeof AudioSamples !== 'undefined' && AudioSamples.hasInstrumentSample(instId));
      if (!customSample) {
        playMelodicBySubtype(ac, now, subtype, event.chord, v * 0.22, instId);
      }
      return;
    }
    if (event.note) {
      let sampleResult = false;
      if (typeof AudioSamples !== 'undefined') {
        sampleResult = AudioSamples.playInstrumentSample(subtype, event, sampleVol * 0.8, instId);
      }
      const customSample = sampleResult === 'custom'
        || (instId && typeof AudioSamples !== 'undefined' && AudioSamples.hasInstrumentSample(instId));
      if (customSample) return;
      if (subtype === 'bass' || roleOrInst === 'Bass') {
        playBassNote(ac, now, event.note, 0.28 * v);
      } else if (subtype === 'brass' || subtype === 'sax' || subtype === 'flute' || roleOrInst === 'Horns') {
        playMelodicBySubtype(ac, now, subtype === 'generic' ? 'brass' : subtype, event.note, v * 0.25, instId);
      } else {
        playMelodicBySubtype(ac, now, subtype, event.note, v * 0.25, instId);
      }
      return;
    }
    if (event.hit) {
      let samplePlayed = false;
      if (typeof AudioSamples !== 'undefined') {
        samplePlayed = AudioSamples.playInstrumentSample(subtype, event, sampleVol, instId);
      }
      const accent = samplePlayed ? 0.35 : 1;
      switch (event.hit) {
        case 'kick': playKick(ac, now, 0.52 * v * accent); break;
        case 'snare': playSnare(ac, now, 0.38 * v * accent); break;
        case 'hihat': playHihat(ac, now, 0.14 * v * accent); break;
        case 'cymbal':
          if (subtype === 'bell') playBellHit(ac, now, 0.22 * v * accent);
          else if (subtype === 'triangle') playTriangleHit(ac, now, 0.18 * v * accent);
          else playCymbal(ac, now, 0.3 * v * accent);
          break;
        case 'shake': playShake(ac, now, 0.22 * v * accent); break;
        case 'ooh':
        case 'ah': playVocal(ac, now, event.hit); break;
        default: playSnare(ac, now, 0.24 * v * accent);
      }
    }
  }

  async function playInstrument(instrument, chord) {
    const ac = getCtx();
    if (!instrument) {
      const now = ac.currentTime;
      playCymbal(ac, now, 0.45);
      return;
    }

    await resume();
    if (typeof AudioSamples !== 'undefined' && instrument.id) {
      await AudioSamples.ensureInstrumentSample(instrument.id);
    }

    const now = ac.currentTime;
    const c = chord || instrument.progression?.[0] || 'C';
    const event = instrument.type === 'percussion'
      ? { hit: instrument.subtype === 'drums' ? 'snare' : instrument.subtype === 'shake' ? 'shake' : 'cymbal' }
      : { chord: c };
    if (typeof AudioSamples !== 'undefined') {
      const played = AudioSamples.playInstrumentSample(instrument.subtype, event, 0.58, instrument.id);
      if (played) {
        if (instrument.type === 'percussion') return;
        const customSample = played === 'custom' || AudioSamples.hasInstrumentSample(instrument.id);
        if (!customSample) {
          playMelodicBySubtype(ac, now, instrument.subtype, c, 0.18, instrument.id);
        }
        return;
      }
    }
    if (instrument.type === 'percussion') {
      switch (instrument.subtype) {
        case 'cymbal': playCymbal(ac, now, 0.3); break;
        case 'shake': playShake(ac, now, 0.22); break;
        case 'drums': playKick(ac, now, 0.48); break;
        case 'bell': playBellHit(ac, now, 0.22); break;
        case 'triangle': playTriangleHit(ac, now, 0.18); break;
        case 'bongo': playSnare(ac, now, 0.32); break;
        default: playCymbal(ac, now, 0.3);
      }
      return;
    }
    playMelodicBySubtype(ac, now, instrument.subtype, c, 1, instrument.id);
  }

  function playFourOnFloorKick(ac, now, vol = 0.62) {
    playKick(ac, now, vol);
    const sub = ac.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(38, now + 0.12);
    const g = masterGain(ac, now, vol * 0.45, 0.18, 0, 'perc');
    sub.connect(g);
    sub.start(now);
    sub.stop(now + 0.18);
  }

  function playDanceClap(ac, now, vol = 0.24) {
    playSnare(ac, now, vol);
    const click = ac.createOscillator();
    click.type = 'square';
    click.frequency.value = 1200;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    bp.Q.value = 1.2;
    const g = masterGain(ac, now, vol * 0.35, 0.06, 0, 'perc');
    click.connect(bp);
    bp.connect(g);
    click.start(now);
    click.stop(now + 0.05);
  }

  function playDanceBeat(ac, now, beatIdx, danceStyle, chord, secId, intensity = 1, drumStyle = 'rock') {
    const v = intensity;
    const beat = beatIdx % 4;
    const isChorus = secId === 'chorus';
    const isVerse = secId === 'verse';

    playDrumStyleBeat(ac, now, beatIdx, drumStyle, v);

    switch (danceStyle) {
      case 'funk-house':
        if (beatIdx % 2 === 1) playHihat(ac, now, 0.13 * v);
        if (beat === 1 || beat === 3) playDanceClap(ac, now, 0.26 * v);
        if (beatIdx % 2 === 0) playLiveBass(ac, now, chord, 0.34 * v);
        if (beatIdx % 4 === 0) playSynth(ac, now, chord, 0.12 * v, true);
        if (beatIdx % 16 === 0) playSongPad(ac, now, chord, 0.13 * v);
        break;
      case 'deep-house':
        if (beatIdx % 2 === 1) playHihat(ac, now, 0.11 * v);
        if (beat === 1 || beat === 3) playDanceClap(ac, now, 0.2 * v);
        playLiveBass(ac, now, chord, 0.36 * v);
        if (beatIdx % 8 === 0) playSongPad(ac, now, chord, 0.15 * v);
        if (isChorus && beatIdx % 4 === 2) playLiveShimmer(ac, now, chord, 0.07 * v);
        break;
      case 'euro':
        if (beatIdx % 2 === 1) playHihat(ac, now, 0.14 * v);
        if (beat === 1 || beat === 3) playSnare(ac, now, 0.3 * v);
        playLiveBass(ac, now, chord, 0.38 * v);
        if (isChorus || isVerse) playSynth(ac, now, chord, 0.1 * v, beatIdx % 2 === 0);
        if (beatIdx % 16 === 0) playSongPad(ac, now, chord, 0.12 * v);
        break;
      case 'disco':
        if (beatIdx % 2 === 1) playHihat(ac, now, 0.15 * v);
        if (beat === 1 || beat === 3) playDanceClap(ac, now, 0.28 * v);
        playLiveBass(ac, now, chord, 0.4 * v);
        if (beatIdx % 4 === 0) playLiveShimmer(ac, now, chord, 0.08 * v);
        if (beatIdx % 8 === 0) playOrgan(ac, now, chord, 0.14 * v);
        if (isChorus && beatIdx % 16 === 0) playCymbal(ac, now, 0.22 * v);
        break;
      case 'techno':
        playHihat(ac, now, 0.12 * v);
        if (beat === 1 || beat === 3) playSnare(ac, now, 0.24 * v);
        if (beatIdx % 2 === 0) playLiveBass(ac, now, chord, 0.42 * v);
        if (beatIdx % 4 === 0) playSynth(ac, now, chord, 0.14 * v, true);
        if (isChorus && beatIdx % 8 === 4) playLiveShimmer(ac, now, chord, 0.06 * v);
        break;
      case 'tropical':
        if (beatIdx % 2 === 1) playShake(ac, now, 0.14 * v);
        if (beat === 1 || beat === 3) playDanceClap(ac, now, 0.22 * v);
        playLiveBass(ac, now, chord, 0.32 * v);
        if (beatIdx % 2 === 0) playMallet(ac, now, chord, 0.1 * v);
        if (beatIdx % 8 === 0) playSongPad(ac, now, chord, 0.12 * v);
        if (isChorus && beatIdx % 4 === 0) playFlute(ac, now, chord, 0.08 * v);
        break;
      default:
        if (beatIdx % 2 === 1) playHihat(ac, now, 0.12 * v);
        if (beat === 1 || beat === 3) playDanceClap(ac, now, 0.22 * v);
        playLiveBass(ac, now, chord, 0.34 * v);
        if (beatIdx % 8 === 0) playSongPad(ac, now, chord, 0.11 * v);
    }
  }

  function playCrash() { playCymbal(getCtx(), getCtx().currentTime, 0.45); }

  function playCheer() {
    const tier = crowdAmbience?.tier ?? 3;
    playCrowdSample(tier, 0.9);
  }

  function playCheerLoud() {
    const tier = crowdAmbience?.tier ?? 8;
    playCrowdSample(tier, 0.48, { loud: true, hotStreak: true });
    setTimeout(() => playCrowdSample(tier, 0.4, { loud: true, hotStreak: true }), 140);
    setTimeout(() => playCrowdSample(tier, 0.34, { loud: true, hotStreak: true }), 300);
  }

  function playCoin() {
    const ac = getCtx();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
    const g = masterGain(ac, now, 0.12, 0.15);
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  function playTick(vol = 0.06) {
    const ac = getCtx();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const g = masterGain(ac, now, vol, 0.04);
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  function playSongPad(ac, now, chordName, vol = 0.06) {
    const freqs = CHORD_FREQS[chordName] || CHORD_FREQS.C;
    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq / 2;
      const osc2 = ac.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = freq;
      const osc3 = ac.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.value = freq * 2;
      const g = ac.createGain();
      const t = now + i * 0.015;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.12);
      g.gain.setValueAtTime(vol * 0.85, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
      connectToMix(g, i === 0 ? -0.3 : i === 2 ? 0.3 : 0, 'music');
      osc.connect(g);
      osc2.connect(g);
      osc3.connect(g);
      osc.start(t);
      osc2.start(t);
      osc3.start(t);
      osc.stop(t + 2.3);
      osc2.stop(t + 2.3);
      osc3.stop(t + 2.3);
    });
  }

  function playLiveBass(ac, now, chordName, vol = 0.2) {
    const note = CHORD_ROOT[chordName] || 'E2';
    const freq = NOTE_FREQ[note] || 82.41;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const osc2 = ac.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 280;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.02);
    g.gain.setValueAtTime(vol * 0.9, now + 0.35);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(lp);
    osc2.connect(lp);
    lp.connect(g);
    connectToMix(g, 0, 'music');
    osc.start(now);
    osc2.start(now);
    osc.stop(now + 0.58);
    osc2.stop(now + 0.58);
  }

  function playLiveShimmer(ac, now, chordName, vol = 0.05) {
    const freqs = (CHORD_FREQS[chordName] || CHORD_FREQS.C).map((f) => f * 2);
    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 800;
      const g = ac.createGain();
      const t = now + i * 0.03;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(hp);
      hp.connect(g);
      connectToMix(g, i % 2 === 0 ? -0.4 : 0.4, 'music');
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  function playLiveStrum(ac, now, chordName, vol = 0.08) {
    playGuitarChord(ac, now, chordName, vol * 1.2);
    const freqs = CHORD_FREQS[chordName] || CHORD_FREQS.C;
    freqs.forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq * 0.5;
      const g = ac.createGain();
      const t = now + i * 0.04;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * 0.4, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(g);
      connectToMix(g, -0.15 + i * 0.15, 'music');
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  function connectCrowd(node, pan = 0) {
    initMix();
    if (pan !== 0) {
      const ac = getCtx();
      const p = ac.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      p.connect(crowdBus);
      return p;
    }
    node.connect(crowdBus);
    return node;
  }

  function playBufferClip(buffer, { start = 0, clipLen, vol, pan = 0, attack = 0.03 } = {}) {
    if (!buffer) return;
    const ac = getCtx();
    const now = ac.currentTime;
    const dur = buffer.duration;
    const len = clipLen ?? dur;
    const offset = Math.max(0, Math.min(start, Math.max(0, dur - 0.05)));
    const playLen = Math.min(len, dur - offset);

    const src = ac.createBufferSource();
    src.buffer = buffer;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + attack);
    g.gain.setValueAtTime(vol * 0.92, now + playLen * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, now + playLen + 0.08);
    connectCrowd(g, pan);
    src.connect(g);
    src.start(now, offset, playLen);
  }

  const CHEER_URLS = ['audio/storegraphic-crowd-cheers-314919.mp3'];
  const BOO_URLS = ['audio/dragon-studio-crowd-booing-494319.mp3'];
  const REWIND_URLS = ['audio/deandre_aaron-dj-turntable-rewind-429858.mp3'];
  const HOT_STREAK_CHEER_VOL = 0.42;
  const HOT_STREAK_CHEER_VOL_RANGE = 0.1;
  let cheerBuffer = null;
  let cheerLoadPromise = null;
  let booBuffer = null;
  let booLoadPromise = null;
  let rewindBuffer = null;
  let rewindLoadPromise = null;
  let activeRewindSfx = null;
  let crowdAmbience = null;
  let useProceduralCheer = false;
  let useProceduralBoo = false;

  const BOO_DUCK_MULT = 0.8;
  const BOO_DUCK_RAMP_SEC = 0.12;

  function fetchDecodeSample(urls) {
    initMix();
    const ac = getCtx();
    const list = Array.isArray(urls) ? urls : [urls];

    const tryNext = (index) => {
      if (index >= list.length) {
        return Promise.reject(new Error(`crowd sample not found (${list.join(', ')})`));
      }
      const url = list[index];
      return fetch(url)
        .then((r) => {
          if (!r.ok) throw new Error(`${url} ${r.status}`);
          return r.arrayBuffer();
        })
        .then((buf) => new Promise((resolve, reject) => {
          ac.decodeAudioData(buf, resolve, reject);
        }))
        .catch((err) => {
          console.warn(`Crowd sample unavailable at ${url}`, err);
          return tryNext(index + 1);
        });
    };

    return tryNext(0);
  }

  function noiseBuffer(ac, duration = 2) {
    const len = Math.floor(ac.sampleRate * duration);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function synthCrowdCheer(ac, now, tier, vol, loud = false) {
    const tn = tierNorm(tier);
    const dur = loud ? 1.8 + tn * 1.4 : 0.9 + tn * 0.7;
    const peak = vol * (loud ? 0.72 : 0.45);

    const noise = ac.createBufferSource();
    noise.buffer = noiseBuffer(ac, dur);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + tn * 600;
    bp.Q.value = 0.7;
    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 280;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0, now);
    ng.gain.linearRampToValueAtTime(peak * 0.7, now + 0.06);
    ng.gain.setValueAtTime(peak * 0.55, now + dur * 0.55);
    ng.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(bp);
    bp.connect(hp);
    hp.connect(ng);
    connectCrowd(ng, (Math.random() - 0.5) * 0.4);
    noise.start(now);
    noise.stop(now + dur + 0.05);

    const voiceCount = loud ? 4 + Math.floor(tn * 4) : 2 + Math.floor(tn * 2);
    for (let i = 0; i < voiceCount; i++) {
      const t = now + i * 0.07 + Math.random() * 0.04;
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      const base = 180 + Math.random() * 220 + tn * 80;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * (1.1 + Math.random() * 0.35), t + 0.12);
      osc.frequency.exponentialRampToValueAtTime(base * 0.85, t + dur * 0.8);
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1400 + tn * 400;
      const vg = ac.createGain();
      vg.gain.setValueAtTime(0, t);
      vg.gain.linearRampToValueAtTime(peak * 0.18, t + 0.04);
      vg.gain.exponentialRampToValueAtTime(0.001, t + 0.35 + Math.random() * 0.25);
      osc.connect(lp);
      lp.connect(vg);
      connectCrowd(vg, (Math.random() - 0.5) * 0.6);
      osc.start(t);
      osc.stop(t + 0.5);
    }
  }

  function synthCrowdBoo(ac, now, tier, vol) {
    const tn = tierNorm(tier);
    const dur = 0.9 + tn * 0.5;
    const peak = vol * 0.42;

    const count = 3 + Math.floor(tn * 3);
    for (let i = 0; i < count; i++) {
      const t = now + i * 0.09;
      const osc = ac.createOscillator();
      osc.type = 'triangle';
      const start = 320 + Math.random() * 80;
      osc.frequency.setValueAtTime(start, t);
      osc.frequency.exponentialRampToValueAtTime(90 + Math.random() * 40, t + dur);
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 220;
      bp.Q.value = 1.2;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak * 0.22, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(bp);
      bp.connect(g);
      connectCrowd(g, (Math.random() - 0.5) * 0.5);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    const noise = ac.createBufferSource();
    noise.buffer = noiseBuffer(ac, dur);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0, now);
    ng.gain.linearRampToValueAtTime(peak * 0.25, now + 0.04);
    ng.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(lp);
    lp.connect(ng);
    connectCrowd(ng, 0);
    noise.start(now);
    noise.stop(now + dur + 0.05);
  }

  function loadCheerSample() {
    if (cheerBuffer) return Promise.resolve(cheerBuffer);
    if (useProceduralCheer) return Promise.reject(new Error('procedural cheer'));
    if (cheerLoadPromise) return cheerLoadPromise;
    cheerLoadPromise = fetchDecodeSample(CHEER_URLS)
      .then((decoded) => {
        cheerBuffer = decoded;
        return decoded;
      })
      .catch((err) => {
        console.warn('Crowd cheer samples failed to load — using synth fallback', err);
        useProceduralCheer = true;
        cheerLoadPromise = null;
        throw err;
      });
    return cheerLoadPromise;
  }

  function loadBooSample() {
    if (booBuffer) return Promise.resolve(booBuffer);
    if (useProceduralBoo) return Promise.reject(new Error('procedural boo'));
    if (booLoadPromise) return booLoadPromise;
    booLoadPromise = fetchDecodeSample(BOO_URLS)
      .then((decoded) => {
        booBuffer = decoded;
        return decoded;
      })
      .catch((err) => {
        console.warn('Crowd boo samples failed to load — using synth fallback', err);
        useProceduralBoo = true;
        booLoadPromise = null;
        throw err;
      });
    return booLoadPromise;
  }

  function loadRewindSample() {
    if (rewindBuffer) return Promise.resolve(rewindBuffer);
    if (rewindLoadPromise) return rewindLoadPromise;
    rewindLoadPromise = fetchDecodeSample(REWIND_URLS)
      .then((decoded) => {
        rewindBuffer = decoded;
        return decoded;
      })
      .catch((err) => {
        console.warn('Rewind SFX failed to load', err);
        rewindLoadPromise = null;
        throw err;
      });
    return rewindLoadPromise;
  }

  function stopRewindSfx() {
    if (!activeRewindSfx) return;
    try {
      activeRewindSfx.source.stop();
    } catch (_) {}
    activeRewindSfx = null;
  }

  function playRewindSfx(vol = 0.85, durationSec = 5) {
    initMix();
    const ac = getCtx();

    const play = () => {
      if (!rewindBuffer) return;
      stopRewindSfx();
      const now = ac.currentTime;
      const clipLen = Math.min(durationSec, rewindBuffer.duration);
      const src = ac.createBufferSource();
      src.buffer = rewindBuffer;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(vol, now + 0.02);
      g.gain.setValueAtTime(vol * 0.95, now + clipLen * 0.75);
      g.gain.exponentialRampToValueAtTime(0.001, now + clipLen + 0.05);
      connectToMix(g, 0, 'music');
      src.connect(g);
      src.onended = () => {
        if (activeRewindSfx?.source === src) activeRewindSfx = null;
      };
      activeRewindSfx = { source: src };
      src.start(now, 0, clipLen);
    };

    if (rewindBuffer) play();
    else loadRewindSample().then(play).catch(() => {});
  }

  function tierNorm(tier) {
    return Math.min(Math.max(tier ?? 0, 0), 24) / 24;
  }

  function playCrowdSample(tier = 0, volMult = 1, opts = {}) {
    initMix();
    const ac = getCtx();
    const loud = !!opts.loud;
    const hotStreak = !!opts.hotStreak;

    if (useProceduralCheer) {
      const tn = tierNorm(tier);
      const baseVol = loud
        ? (hotStreak ? 0.16 + tn * 0.08 : 0.48 + tn * 0.32)
        : 0.22 + tn * 0.22;
      synthCrowdCheer(ac, ac.currentTime, tier, baseVol * volMult, loud);
      return;
    }

    const play = () => {
      if (!cheerBuffer) return;
      const tn = tierNorm(tier);
      const dur = cheerBuffer.duration;
      const clipLen = loud
        ? (hotStreak
          ? Math.min(2.2 + tn * 1.2, dur * 0.28)
          : Math.min(5 + tn * 2, dur))
        : Math.min(2 + tn * 1.5, dur * 0.35);
      const start = opts.start ?? 0;
      const baseVol = loud
        ? (hotStreak ? 0.18 + tn * 0.1 : 0.42 + tn * 0.22)
        : 0.22 + tn * 0.14;
      const vol = baseVol * volMult;
      const pan = (Math.random() - 0.5) * (0.15 + tn * 0.35);
      playBufferClip(cheerBuffer, { start, clipLen, vol, pan });
    };

    if (cheerBuffer) play();
    else loadCheerSample().then(play).catch(() => {
      synthCrowdCheer(ac, ac.currentTime, tier, (loud ? (hotStreak ? 0.22 : 0.4) : 0.2) * volMult, loud);
    });
  }

  function scheduleCrowdCheer() {
    if (!crowdAmbience || crowdAmbience.booing || crowdAmbience.introMode) return;
    const { tier, cheerMult } = crowdAmbience;
    const tn = tierNorm(tier);
    const mult = cheerMult || 1;

    playCrowdSample(tier, mult);
    if (tn > 0.45 && Math.random() < tn * 0.35) {
      setTimeout(() => {
        if (crowdAmbience && !crowdAmbience.booing) playCrowdSample(tier, mult * 0.65);
      }, 180 + Math.random() * 220);
    }

    const nextDelay = Math.max(1400, 5200 - tier * 140) + Math.random() * 2200;
    crowdAmbience.cheerTimeout = setTimeout(scheduleCrowdCheer, nextDelay);
  }

  function scheduleHotStreakCheer() {
    if (!crowdAmbience?.hotStreak || crowdAmbience.booing || crowdAmbience.introMode) return;
    const { tier } = crowdAmbience;
    const mult = HOT_STREAK_CHEER_VOL + Math.random() * HOT_STREAK_CHEER_VOL_RANGE;
    playCrowdSample(tier, mult, { loud: true, hotStreak: true });
    if (Math.random() < 0.22) {
      setTimeout(() => {
        if (crowdAmbience?.hotStreak && !crowdAmbience.booing) {
          playCrowdSample(tier, mult * 0.82, { loud: true, hotStreak: true });
        }
      }, 100 + Math.random() * 80);
    }
    const nextDelay = 1200 + Math.random() * 800;
    crowdAmbience.hotStreakCheerTimeout = setTimeout(scheduleHotStreakCheer, nextDelay);
  }

  function resetGameplayDuck() {
    initMix();
    const ac = getCtx();
    const now = ac.currentTime;
    [musicBus, percBus].forEach((bus) => {
      if (!bus) return;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(1, now);
    });
  }

  function applyGameplayDuck(active) {
    initMix();
    const ac = getCtx();
    const now = ac.currentTime;
    const target = active ? BOO_DUCK_MULT : 1;
    [musicBus, percBus].forEach((bus) => {
      if (!bus) return;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(target, now + BOO_DUCK_RAMP_SEC);
    });
  }

  function setHotStreakCheering(active) {
    if (!crowdAmbience) return;
    if (!!crowdAmbience.hotStreak === !!active) return;
    crowdAmbience.hotStreak = active;
    if (active) {
      playCheerLoud();
      scheduleHotStreakCheer();
    } else {
      if (crowdAmbience.hotStreakCheerTimeout) {
        clearTimeout(crowdAmbience.hotStreakCheerTimeout);
        crowdAmbience.hotStreakCheerTimeout = null;
      }
      crowdAmbience.cheerMult = 1;
    }
  }

  function playHitBurst(rating = 'good', volMult = 1) {
    const ac = getCtx();
    const now = ac.currentTime;
    const peak = (rating === 'perfect' ? 0.42 : 0.28) * volMult;

    playKick(ac, now, peak * 0.85);
    playSnare(ac, now, peak * 0.55);

    const zap = ac.createOscillator();
    zap.type = 'square';
    zap.frequency.setValueAtTime(rating === 'perfect' ? 880 : 660, now);
    zap.frequency.exponentialRampToValueAtTime(220, now + 0.08);
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 2;
    const zg = masterGain(ac, now, peak * 0.35, 0.1, 0, 'perc');
    zap.connect(bp);
    bp.connect(zg);
    zap.start(now);
    zap.stop(now + 0.1);

    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      const g = ac.createGain();
      const t = now + i * 0.012;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(peak * 0.12, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      connectToMix(g, (i - 1) * 0.2, 'music');
      osc.connect(lp);
      lp.connect(g);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  function playCrowdChirp(tier, mult = 1) {
    playCrowdSample(tier, mult);
  }

  function playBoo(volMult = 1) {
    initMix();
    const ac = getCtx();
    const tier = crowdAmbience?.tier ?? 3;

    if (useProceduralBoo) {
      synthCrowdBoo(ac, ac.currentTime, tier, (0.35 + tierNorm(tier) * 0.3) * volMult);
      return;
    }

    const play = () => {
      if (!booBuffer) return;
      const tn = tierNorm(tier);
      const vol = (0.5 + tn * 0.2) * volMult;
      const pan = (Math.random() - 0.5) * (0.25 + tn * 0.3);
      playBufferClip(booBuffer, { start: 0, clipLen: booBuffer.duration, vol, pan, attack: 0.02 });
    };

    if (booBuffer) play();
    else loadBooSample().then(play).catch(() => {
      synthCrowdBoo(ac, ac.currentTime, tier, 0.4 * volMult);
    });
  }

  function scheduleIntroCrowdBed() {
    if (!crowdAmbience || !crowdAmbience.introMode) return;
    const { tier } = crowdAmbience;
    playCrowdSample(tier, 0.42, { loud: true });
    crowdAmbience.introTimeout = setTimeout(scheduleIntroCrowdBed, 2400);
  }

  function startCrowdAmbience(tier = 0, opts = {}) {
    stopCrowdAmbience();
    initMix();
    const introMode = opts.intro === true;

    loadCheerSample().then(() => {
      playCrowdSample(tier, introMode ? 0.5 : 0.75);
    }).catch(() => {
      playCrowdSample(tier, introMode ? 0.5 : 0.75);
    });
    loadBooSample().catch(() => {});

    const booInterval = setInterval(() => {
      if (crowdAmbience?.booing) playBoo(0.7 + tierNorm(crowdAmbience.tier) * 0.2);
    }, 1400);

    crowdAmbience = {
      tier, booing: false, cheerMult: 1, booInterval, cheerTimeout: null,
      introMode, introTimeout: null,
      hotStreak: false, hotStreakCheerTimeout: null,
    };

    if (introMode) {
      crowdAmbience.introTimeout = setTimeout(scheduleIntroCrowdBed, 1200);
    }
  }

  function endCrowdIntro() {
    if (!crowdAmbience || !crowdAmbience.introMode) return;
    crowdAmbience.introMode = false;
    if (crowdAmbience.introTimeout) {
      clearTimeout(crowdAmbience.introTimeout);
      crowdAmbience.introTimeout = null;
    }
  }

  function stopCrowdAmbience() {
    if (!crowdAmbience) return;
    clearInterval(crowdAmbience.booInterval);
    if (crowdAmbience.cheerTimeout) clearTimeout(crowdAmbience.cheerTimeout);
    if (crowdAmbience.introTimeout) clearTimeout(crowdAmbience.introTimeout);
    if (crowdAmbience.hotStreakCheerTimeout) clearTimeout(crowdAmbience.hotStreakCheerTimeout);
    resetGameplayDuck();
    crowdAmbience = null;
  }

  function setCrowdBooing(active) {
    if (!crowdAmbience) return;
    const wasBooing = !!crowdAmbience.booing;
    if (wasBooing === !!active) return;
    crowdAmbience.booing = active;
    applyGameplayDuck(active);
    if (active) {
      loadBooSample().then(() => {
        playBoo(1.1);
        setTimeout(() => playBoo(1), 200);
        setTimeout(() => playBoo(0.9), 450);
      }).catch(() => {});
    }
  }

  function boostCrowdCheer() {
    if (!crowdAmbience) return;
    const { tier } = crowdAmbience;
    crowdAmbience.cheerMult = 2;
    playCrowdSample(tier, 2, { loud: true });
    setTimeout(() => playCrowdSample(tier, 1.8, { loud: true }), 100);
    setTimeout(() => playCrowdSample(tier, 1.6, { loud: true }), 240);
    setTimeout(() => { if (crowdAmbience) crowdAmbience.cheerMult = 1; }, 2500);
  }

  function playMiss() {
    const ac = getCtx();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
    const g = masterGain(ac, now, 0.06, 0.14, 0, 'music');
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  // Soft confirm "tap" played on any UI button/selection click (menus, shop,
  // back buttons, etc). Kept short, quiet, and on the dry 'perc' bus so it
  // never competes with gameplay/instrument audio.
  function playUIClick(vol = 1) {
    const ac = getCtx();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(950, now + 0.045);
    const g = masterGain(ac, now, 0.09 * vol, 0.06, 0, 'perc');
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  return {
    resume, getCtx, initMix, getMix, connectToMix,
    setMasterVolume, getMasterVolume, unlockIOSAudioSession,
    playCrash, playCheer, playCheerLoud, playCoin, playMiss, playTick, playUIClick, playHitBurst,
    playInstrument, playPartEvent, playSongPad, startSustain, stopSustain,
    startCrowdAmbience, stopCrowdAmbience, endCrowdIntro, setCrowdBooing, setHotStreakCheering, boostCrowdCheer, playBoo, playCrowdSample, loadCheerSample, loadBooSample, loadRewindSample, playRewindSfx, stopRewindSfx,
    playLiveBass, playLiveShimmer, playLiveStrum, playDanceBeat, playDrumStyleBeat, playFourOnFloorKick,
    playKick, playSnare, playHihat, playCymbal, playShake,
    playChord, playGuitarChord, playBassNote, playKeysChord, playHornNote, playVocal,
    playUkulele, playElectricGuitar, playPiano,
  };
})();
