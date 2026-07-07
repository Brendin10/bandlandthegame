const InstrumentArt = (() => {
  const O = '#1C1230';
  const ART_BASE = 'assets/instruments/';

  const ART_IDS = new Set(['trash-lid', 'drums', 'bass', 'electric-guitar', 'keys']);

  const pngFailed = new Set();

  function hasArt(inst) {
    return !!(inst?.id && ART_IDS.has(inst.id) && !pngFailed.has(inst.id));
  }

  function markPngFailed(instId) {
    if (instId) pngFailed.add(instId);
  }

  function artUrl(inst) {
    return `${ART_BASE}${inst.id}.png`;
  }

  function shouldHideSticks(inst) {
    if (!hasArt(inst) || typeof InstrumentGrips === 'undefined') return false;
    return !!InstrumentGrips.getGrip(inst)?.hideSticks;
  }

  const PNG_FRAME = {
    'trash-lid': { w: 800, h: 800, viewBox: '250 128 299 427' },
    drums: { w: 800, h: 800, viewBox: '177 220 445 360' },
    bass: { w: 409, h: 1024, viewBox: '25 29 359 995' },
    'electric-guitar': { w: 800, h: 800, viewBox: '181 133 438 398' },
    keys: { w: 800, h: 800, viewBox: '201 184 397 431' },
  };

  function pngFrame(instId) {
    return PNG_FRAME[instId] || { w: 800, h: 800, viewBox: '0 0 800 800' };
  }

  function renderHeldImage(inst, anim = '') {
    const grip = typeof InstrumentGrips !== 'undefined'
      ? InstrumentGrips.getGrip(inst)
      : null;
    const w = grip?.art?.w ?? 70;
    const h = grip?.art?.h ?? 75;
    const mount = grip
      ? InstrumentGrips.mountTransform(grip)
      : { transform: 'translate(70,35)', w, h };
    const frame = pngFrame(inst.id);
    const playCls = anim ? ` ${anim}` : '';
    return `
      <g class="held-mount held-instrument held-img held-${inst.id}" transform="${mount.transform}">
        <g class="held-play instrument-layered${playCls}">
          <svg x="0" y="0" width="${mount.w}" height="${mount.h}" viewBox="${frame.viewBox}" preserveAspectRatio="xMidYMid meet">
            <image href="${artUrl(inst)}" width="${frame.w}" height="${frame.h}"
              class="held-instrument-img"
              data-inst-id="${inst.id}"
              onerror="typeof InstrumentArt!=='undefined'&&InstrumentArt.markPngFailed('${inst.id}')"/>
          </svg>
        </g>
      </g>`;
  }

  function renderShopPreview(inst, size = 72) {
    if (!hasArt(inst)) {
      const svg = renderHeldSvg(inst, 'idle');
      return `<svg viewBox="0 0 200 270" width="${size}" height="${Math.round(size * 1.3)}" class="shop-inst-preview shop-inst-svg">${svg}</svg>`;
    }
    const h = Math.round(size * 1.3);
    return `<img src="${artUrl(inst)}" width="${size}" height="${h}" class="inst-art-card" alt="${inst.name}" loading="lazy"
      onerror="this.classList.add('inst-art-missing');this.alt='${inst.emoji}'"/>`;
  }

  function renderInventoryThumb(inst, size = 36) {
    if (!hasArt(inst)) return `<span class="inv-emoji">${inst.emoji}</span>`;
    const h = Math.round(size * 1.3);
    return `<img src="${artUrl(inst)}" width="${size}" height="${h}" class="inv-art-thumb" alt="${inst.name}" loading="lazy"
      onerror="this.outerHTML='<span class=\\'inv-emoji\\'>${inst.emoji}</span>'"/>`;
  }

  function wrap(cls, transform, layers, anim = '') {
    return `<g class="held-mount held-instrument ${cls} instrument-layered" transform="${transform}">
      <g class="held-play ${anim}">${layers}</g>
    </g>`;
  }

  function layer(cls, content) {
    return `<g class="inst-layer ${cls}">${content}</g>`;
  }

  function shadow(rx = 24, ry = 8, cy = 28) {
    return layer('inst-shadow', `<ellipse cx="4" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(0,0,0,0.22)"/>`);
  }

  function renderStrings(inst, anim) {
    const map = {
      ukulele: { body: '#a06830', neck: '#6B4423', w: 20, h: 14, n: 4, rot: '-25' },
      'electric-guitar': { body: '#8B0000', neck: '#1a1a1a', w: 22, h: 16, n: 6, rot: '-20', electric: true },
      bass: { body: '#2a2a4a', neck: '#1a1a2e', w: 24, h: 14, n: 4, rot: '-18' },
      banjo: { body: '#deb887', neck: '#6B4423', w: 20, h: 20, n: 5, rot: '-20', round: true },
      violin: { body: '#8B4513', neck: '#5a3018', w: 14, h: 22, n: 4, rot: '-30', violin: true },
    };
    const cfg = map[inst.id] || map['acoustic-guitar'];
    let body = `<ellipse cx="0" cy="20" rx="${cfg.w}" ry="${cfg.h}" fill="${cfg.body}" stroke="${O}" stroke-width="3"/>`;
    if (cfg.round) body = `<circle cx="0" cy="18" r="${cfg.w}" fill="${cfg.body}" stroke="${O}" stroke-width="3"/><circle cx="0" cy="18" r="10" fill="#f5e6c8" stroke="${O}" stroke-width="2"/>`;
    else if (cfg.violin) body = `<path d="M0,-8 Q14,8 10,28 Q0,34 -10,28 Q-14,8 0,-8 Z" fill="${cfg.body}" stroke="${O}" stroke-width="3"/>`;
    else if (cfg.electric) body = `<ellipse cx="0" cy="22" rx="22" ry="16" fill="${cfg.body}" stroke="${O}" stroke-width="3"/>`;
    const neck = cfg.electric
      ? `<path d="M-7,-38 L7,-38 L9,18 Q0,24 -9,18 Z" fill="${cfg.neck}" stroke="${O}" stroke-width="3"/>`
      : `<rect x="-5" y="-32" width="10" height="52" rx="3" fill="${cfg.neck}" stroke="${O}" stroke-width="2"/>`;
    const strLines = Array.from({ length: cfg.n }, (_, i) => {
      const x = -3 + (i * 6) / (cfg.n - 1 || 1);
      return `<line x1="${x.toFixed(1)}" y1="-28" x2="${(x * 0.8).toFixed(1)}" y2="32" stroke="#bbb" stroke-width="0.7"/>`;
    }).join('');
    const inner = `${shadow()}${layer('inst-body', body)}${layer('inst-neck', neck)}${layer('inst-strings', strLines)}`;
    return wrap(`held-${inst.id}`, `translate(100,158) rotate(${cfg.rot})`, inner, anim);
  }

  function renderBrass(inst, anim) {
    const gold = inst.subtype === 'sax' ? '#c47a20' : '#d4a017';
    const inner = `
      ${shadow(20, 7, 20)}
      ${layer('inst-body', `
        <path d="M-8,8 Q-4,-8 8,-12 Q28,-14 38,4 L34,14 Q20,6 8,10 Z" fill="${gold}" stroke="${O}" stroke-width="2.5"/>
        <circle cx="-6" cy="4" r="5" fill="${gold}" stroke="${O}" stroke-width="2"/>
        ${inst.id === 'trombone' ? '<rect x="20" y="0" width="28" height="6" rx="3" fill="#bbb" stroke="' + O + '" stroke-width="1.5"/>' : ''}
        ${inst.subtype === 'sax' ? '<path d="M-10,6 Q-16,20 -8,32 L-2,28 Q-8,18 -4,8 Z" fill="' + gold + '" stroke="' + O + '" stroke-width="2"/>' : ''}`)}
      ${layer('inst-bell', `<ellipse cx="36" cy="8" rx="12" ry="10" fill="${gold}" stroke="${O}" stroke-width="2.5"/>`)}`;
    return wrap(`held-${inst.id}`, 'translate(108,142) rotate(-28)', inner, anim);
  }

  function renderKeys(inst, anim) {
    const palettes = {
      piano: { body: '#1a1a2e', keys: '#f5f5f5', lid: '#2a2a4a' },
      keys: { body: '#1a1a2e', keys: '#f5f5f5', lid: '#2a2a4a' },
      keyboard: { body: '#222', keys: '#eee', lid: '#333' },
      organ: { body: '#3d2010', keys: '#f8f8f8', lid: '#5a3020' },
      accordion: { body: '#c0392b', keys: '#fff', lid: '#e74c3c' },
    };
    const p = palettes[inst.id] || palettes.keyboard;
    let shape;
    if (inst.id === 'accordion') {
      shape = `
        ${layer('inst-bellows', `<rect x="-28" y="-6" width="56" height="28" rx="6" fill="${p.body}" stroke="${O}" stroke-width="2"/>
          <path d="M-20,-2 Q-10,6 0,-2 Q10,6 20,-2" fill="none" stroke="${O}" stroke-width="1.5"/>
          <path d="M-20,8 Q-10,16 0,8 Q10,16 20,8" fill="none" stroke="${O}" stroke-width="1.5"/>`)}
        ${layer('inst-keys', Array.from({ length: 8 }, (_, i) => `<rect x="${-24 + i * 6}" y="10" width="5" height="12" fill="${p.keys}" stroke="${O}" stroke-width="0.5"/>`).join(''))}`;
    } else if (inst.id === 'organ') {
      shape = `
        ${layer('inst-body', `<rect x="-30" y="-20" width="60" height="40" rx="4" fill="${p.body}" stroke="${O}" stroke-width="3"/>
          ${Array.from({ length: 4 }, (_, r) => Array.from({ length: 5 }, (_, c) => `<circle cx="${-18 + c * 9}" cy="${-12 + r * 8}" r="2.5" fill="#888" stroke="${O}" stroke-width="1"/>`).join('')).join('')}`)}
        ${layer('inst-keys', `<rect x="-26" y="8" width="52" height="14" rx="2" fill="#111" stroke="${O}" stroke-width="1.5"/>
          ${Array.from({ length: 7 }, (_, i) => `<rect x="${-22 + i * 7}" y="10" width="6" height="10" fill="${p.keys}"/>`).join('')}`)}`;
    } else {
      shape = `
        ${layer('inst-lid', (inst.id === 'piano' || inst.id === 'keys') ? `<path d="M-32,-14 L32,-14 L28,0 L-28,0 Z" fill="${p.lid}" stroke="${O}" stroke-width="2"/>` : '')}
        ${layer('inst-body', `<rect x="-32" y="-8" width="64" height="28" rx="4" fill="${p.body}" stroke="${O}" stroke-width="3"/>`)}
        ${layer('inst-keys', Array.from({ length: 10 }, (_, i) => `<rect x="${-28 + i * 6}" y="-2" width="5" height="16" fill="${i % 7 === 0 || i % 7 === 3 ? '#222' : p.keys}" stroke="${O}" stroke-width="0.5"/>`).join(''))}`;
    }
    const inner = `${shadow(32, 8, 18)}${shape}`;
    return wrap(`held-${inst.id}`, 'translate(100,152)', inner, anim);
  }

  function renderWoodwind(inst, anim) {
    const colors = { flute: '#e8f4ff', clarinet: '#1a1a1a', harmonica: '#555' };
    const fill = colors[inst.id] || '#ccc';
    let inner;
    if (inst.id === 'harmonica') {
      inner = `${shadow(16, 6, 12)}${layer('inst-body', `<rect x="-20" y="-6" width="40" height="14" rx="4" fill="${fill}" stroke="${O}" stroke-width="2"/>
        ${Array.from({ length: 8 }, (_, i) => `<circle cx="${-14 + i * 4}" cy="1" r="1.5" fill="#222"/>`).join('')}`)}`;
      return wrap(`held-${inst.id}`, 'translate(118,138)', inner, anim);
    }
    inner = `${shadow(14, 6, 18)}${layer('inst-body', `<rect x="-4" y="-30" width="8" height="58" rx="4" fill="${fill}" stroke="${O}" stroke-width="2"/>
      ${Array.from({ length: 6 }, (_, i) => `<circle cx="0" cy="${-20 + i * 8}" r="2" fill="#333" stroke="${O}" stroke-width="1"/>`).join('')}
      <ellipse cx="0" cy="-32" rx="6" ry="4" fill="${fill}" stroke="${O}" stroke-width="2"/>`)}`;
    return wrap(`held-${inst.id}`, 'translate(115,145) rotate(-15)', inner, anim);
  }

  function renderSynth(inst, anim) {
    const inner = `${shadow(28, 8, 16)}${layer('inst-body', `<rect x="-30" y="-12" width="60" height="32" rx="5" fill="#2d1b69" stroke="${O}" stroke-width="3"/>
      ${Array.from({ length: 6 }, (_, i) => `<circle cx="${-20 + i * 8}" cy="-4" r="3" fill="#9b6bff" stroke="${O}" stroke-width="1"/><rect x="${-22 + i * 8}" y="4" width="4" height="8" rx="1" fill="#666"/>`).join('')}
      <rect x="-24" y="14" width="48" height="4" rx="1" fill="#4ecdc4"/>`)}`;
    return wrap(`held-${inst.id}`, 'translate(100,150)', inner, anim);
  }

  function renderTrashLid(anim) {
    const inner = `
      ${layer('inst-shadow', `<ellipse cx="4" cy="6" rx="30" ry="8" fill="rgba(0,0,0,0.25)"/>`)}
      ${layer('inst-rim', `<ellipse cx="0" cy="0" rx="30" ry="30" fill="#a8a8a8" stroke="${O}" stroke-width="3"/><ellipse cx="0" cy="-2" rx="28" ry="28" fill="#c8c8c8"/>`)}
      ${layer('inst-face', `<ellipse cx="0" cy="2" rx="22" ry="22" fill="#e8e8e8"/>`)}
      ${layer('inst-handle', `<rect x="-4" y="22" width="8" height="18" rx="3" fill="#888" stroke="${O}" stroke-width="2"/>`)}`;
    return wrap('held-cymbal', 'translate(118,148) rotate(-18)', inner, anim);
  }

  function renderTambourine(anim) {
    const inner = `
      ${layer('inst-shadow', `<ellipse cx="2" cy="8" rx="26" ry="7" fill="rgba(0,0,0,0.22)"/>`)}
      ${layer('inst-frame', `<circle cx="0" cy="0" r="24" fill="#b8860b" stroke="${O}" stroke-width="3"/><circle cx="0" cy="0" r="20" fill="#d4a017"/>`)}
      ${layer('inst-jingles', ['-14,-10', '12,-8', '-8,12', '10,10'].map((p) => {
        const [x, y] = p.split(',');
        return `<circle cx="${x}" cy="${y}" r="2.5" fill="#ccc"/>`;
      }).join(''))}`;
    return wrap('held-tambourine', 'translate(122,142)', inner, anim);
  }

  function renderDrumKit(anim) {
    const inner = `
      ${layer('inst-shadow', `<ellipse cx="100" cy="178" rx="90" ry="12" fill="rgba(0,0,0,0.2)"/>`)}
      ${layer('inst-kick', `<ellipse class="drum-piece drum-kick" cx="100" cy="178" rx="28" ry="18" fill="#5a3018" stroke="${O}" stroke-width="2.5"/><ellipse cx="100" cy="174" rx="24" ry="14" fill="#8B4513"/><circle cx="100" cy="174" r="8" fill="#c8c8c8" stroke="${O}" stroke-width="1.5"/>`)}
      ${layer('inst-snare', `<ellipse class="drum-piece drum-snare" cx="62" cy="172" rx="18" ry="12" fill="#8B4513" stroke="${O}" stroke-width="2"/><ellipse cx="62" cy="168" rx="16" ry="10" fill="#e8e8e8"/>`)}
      ${layer('inst-hihat', `<ellipse cx="138" cy="158" rx="14" ry="10" fill="#bbb" stroke="${O}" stroke-width="2"/><ellipse cx="138" cy="156" rx="12" ry="8" fill="#ddd"/><line x1="138" y1="156" x2="138" y2="178" stroke="#666" stroke-width="3"/>`)}
      ${layer('inst-cymbal', `<ellipse class="drum-piece drum-cymbal" cx="100" cy="148" rx="20" ry="14" fill="#c8c8c8" stroke="${O}" stroke-width="2"/><ellipse cx="100" cy="146" rx="18" ry="12" fill="#e0e0e0"/>`)}
      ${layer('inst-toms', `<ellipse cx="82" cy="162" rx="12" ry="9" fill="#a0522d" stroke="${O}" stroke-width="1.5"/><ellipse cx="118" cy="162" rx="12" ry="9" fill="#a0522d" stroke="${O}" stroke-width="1.5"/>`)}`;
    return wrap('held-drums', 'translate(0,0)', inner, anim);
  }

  function renderPercussion(inst, anim) {
    if (inst.id === 'drums') return renderDrumKit(anim);
    if (inst.id === 'trash-lid') return renderTrashLid(anim);
    if (inst.id === 'tambourine') return renderTambourine(anim);
    if (inst.id === 'drum-kit') return renderDrumKit(anim);
    if (inst.id === 'bongo') {
      const inner = `${shadow(18, 7, 14)}${layer('inst-body', `<ellipse cx="-10" cy="8" rx="14" ry="12" fill="#8B4513" stroke="${O}" stroke-width="2"/><ellipse cx="12" cy="6" rx="11" ry="10" fill="#a0522d" stroke="${O}" stroke-width="2"/>`)}`;
      return wrap('held-bongo', 'translate(100,155)', inner, anim);
    }
    if (inst.id === 'cowbell') {
      const inner = `${shadow(12, 6, 14)}${layer('inst-body', `<path d="M-12,0 Q0,-14 12,0 L10,16 Q0,20 -10,16 Z" fill="#d4a017" stroke="${O}" stroke-width="2.5"/>`)}`;
      return wrap('held-cowbell', 'translate(120,140) rotate(-20)', inner, anim);
    }
    if (inst.id === 'triangle') {
      const inner = `${layer('inst-body', `<path d="M0,-18 L16,14 L-16,14 Z" fill="none" stroke="#ffd166" stroke-width="4" stroke-linejoin="round"/><line x1="0" y1="-18" x2="0" y2="-28" stroke="#888" stroke-width="2"/>`)}`;
      return wrap('held-triangle', 'translate(122,135)', inner, anim);
    }
    if (inst.id === 'xylophone') {
      const bars = ['#ff6b6b', '#ffd166', '#6bcb77', '#4ecdc4', '#9b6bff'].map((c, i) =>
        `<rect x="${-22 + i * 9}" y="${-4 + i}" width="8" height="22" rx="2" fill="${c}" stroke="${O}" stroke-width="1"/>`
      ).join('');
      const inner = `${shadow(24, 7, 16)}${layer('inst-body', bars)}`;
      return wrap('held-xylophone', 'translate(100,148)', inner, anim);
    }
    return renderTrashLid(anim);
  }

  function renderHeldSvg(inst, pose = 'idle') {
    if (!inst) return '';
    const anim = pose !== 'idle' ? `inst-${pose}` : '';
    const family = {
      bass: 'strings',
      'electric-guitar': 'strings',
      keys: 'keys',
      drums: 'percussion',
    }[inst.id] || (inst.type === 'percussion' ? 'percussion' : 'strings');

    switch (family) {
      case 'strings': return renderStrings(inst, anim);
      case 'brass': return renderBrass(inst, anim);
      case 'keys': return renderKeys(inst, anim);
      case 'woodwind': return renderWoodwind(inst, anim);
      case 'synth': return renderSynth(inst, anim);
      case 'percussion': return renderPercussion(inst, anim);
      default: return renderStrings({ ...inst, id: 'acoustic-guitar' }, anim);
    }
  }

  function renderHeld(inst, pose = 'idle') {
    if (!inst) return '';
    if (hasArt(inst)) {
      const anim = pose !== 'idle' ? `inst-${pose}` : '';
      return renderHeldImage(inst, anim);
    }
    return renderHeldSvg(inst, pose);
  }

  function triggerDrumHit(rootEl, hitType = 'snare') {
    if (!rootEl) return;
    const piece = rootEl.querySelector(`.drum-${hitType}`) || rootEl.querySelector('.drum-snare');
    if (!piece) return;
    piece.classList.remove('drum-hit-flash');
    void piece.offsetWidth;
    piece.classList.add('drum-hit-flash');
  }

  return {
    renderHeld,
    renderShopPreview,
    renderInventoryThumb,
    hasArt,
    artUrl,
    markPngFailed,
    shouldHideSticks,
    triggerDrumHit,
  };
})();

window.InstrumentArt = InstrumentArt;

function renderInstrumentArt(inst, pose = 'idle') {
  return InstrumentArt.renderHeld(inst, pose);
}
