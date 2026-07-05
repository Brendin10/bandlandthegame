const WEARABLE_DEFS = {
  'street-tee': { cat: 'clothes', z: 6, render: (c) => `
    <path d="M52 148 Q100 132 148 148 L144 182 Q100 192 56 182 Z" fill="${c === 'lizzy' ? '#6BCBFF' : '#FF6B9D'}" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M62 154 Q100 142 138 154 L134 174 Q100 182 66 174 Z" fill="${c === 'lizzy' ? '#8EDBFF' : '#FF9EB8'}" opacity="0.7"/>
    <text x="100" y="168" text-anchor="middle" fill="white" font-family="Fredoka,sans-serif" font-size="11" font-weight="700" opacity="0.85">BL</text>` },
  'sparkle-jacket': { cat: 'clothes', z: 7, render: () => `
    <path d="M48 140 Q100 124 152 140 L146 188 Q100 200 54 188 Z" fill="#2a1848" stroke="${OUTLINE}" stroke-width="3" opacity="0.35"/>
    <path d="M54 144 Q100 130 146 144 L140 180 Q100 190 60 180 Z" fill="url(#sparkleGrad)" stroke="${OUTLINE}" stroke-width="3"/>
    <defs><linearGradient id="sparkleGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFD166"/><stop offset="50%" stop-color="#FF6B9D"/><stop offset="100%" stop-color="#6BCBFF"/></linearGradient></defs>
    ${[[72,158],[100,150],[128,158],[88,172],[112,172]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff" opacity="0.9"/>`).join('')}` },
  'stage-outfit': { cat: 'clothes', z: 7, render: (c) => `
    <path d="M46 138 Q100 118 154 138 L148 194 Q100 208 52 194 Z" fill="${c === 'lizzy' ? '#FF3D9A' : '#9B6BFF'}" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M58 146 Q100 128 142 146 L136 184 Q100 196 64 184 Z" fill="${c === 'lizzy' ? '#FF7EC0' : '#C49AFF'}"/>
    <path d="M88 132 L100 118 L112 132 L108 196 L92 196 Z" fill="#FFD166" stroke="${OUTLINE}" stroke-width="2"/>
    <circle cx="76" cy="162" r="5" fill="#FFD166"/><circle cx="124" cy="162" r="5" fill="#FFD166"/>` },
  'glitter-eyes': { cat: 'makeup', z: 12, render: () => `
    <ellipse cx="78" cy="86" rx="19" ry="20" fill="none" stroke="#FFD166" stroke-width="3" opacity="0.85"/>
    <ellipse cx="122" cy="86" rx="19" ry="20" fill="none" stroke="#FF6B9D" stroke-width="3" opacity="0.85"/>
    ${[[70,78],[86,80],[74,92],[118,78],[134,80],[126,92]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.5" fill="#fff"/>`).join('')}` },
  'rock-star-face': { cat: 'makeup', z: 12, render: () => `
    <polygon points="100,72 108,88 124,88 112,98 116,114 100,106 84,114 88,98 76,88 92,88" fill="#FFD166" stroke="${OUTLINE}" stroke-width="2" opacity="0.9"/>
    <path d="M64 98 Q56 108 60 118" fill="none" stroke="#FF6B9D" stroke-width="3" stroke-linecap="round"/>
    <path d="M136 98 Q144 108 140 118" fill="none" stroke="#6BCBFF" stroke-width="3" stroke-linecap="round"/>` },
  'cool-shades': { cat: 'accessories', z: 13, render: () => `
    <rect x="58" y="80" width="36" height="16" rx="6" fill="#1a1a2e" stroke="${OUTLINE}" stroke-width="2"/>
    <rect x="106" y="80" width="36" height="16" rx="6" fill="#1a1a2e" stroke="${OUTLINE}" stroke-width="2"/>
    <line x1="94" y1="88" x2="106" y2="88" stroke="${OUTLINE}" stroke-width="3"/>
    <line x1="58" y1="88" x2="48" y2="84" stroke="${OUTLINE}" stroke-width="2"/>
    <line x1="142" y1="88" x2="152" y2="84" stroke="${OUTLINE}" stroke-width="2"/>
    <ellipse cx="76" cy="86" rx="8" ry="4" fill="#6BCBFF" opacity="0.25"/>
    <ellipse cx="124" cy="86" rx="8" ry="4" fill="#6BCBFF" opacity="0.25"/>` },
  'chain-necklace': { cat: 'accessories', z: 8, render: () => `
    <path d="M72 128 Q100 148 128 128" fill="none" stroke="#d4a017" stroke-width="4" stroke-linecap="round"/>
    ${Array.from({length: 9}, (_, i) => {
      const t = i / 8;
      const x = 72 + t * 56;
      const y = 128 + Math.sin(t * Math.PI) * 20;
      return `<circle cx="${x}" cy="${y}" r="2.5" fill="#FFD166" stroke="${OUTLINE}" stroke-width="1"/>`;
    }).join('')}
    <polygon points="100,148 104,158 96,158" fill="#FFD166" stroke="${OUTLINE}" stroke-width="1"/>` },
  'top-hat': { cat: 'accessories', z: 14, render: () => `
    <ellipse cx="100" cy="52" rx="38" ry="8" fill="#1a1a2e" stroke="${OUTLINE}" stroke-width="3"/>
    <rect x="78" y="8" width="44" height="46" rx="4" fill="#1a1a2e" stroke="${OUTLINE}" stroke-width="3"/>
    <rect x="78" y="40" width="44" height="8" fill="#8B0000" stroke="${OUTLINE}" stroke-width="2"/>
    <rect x="82" y="12" width="36" height="28" rx="2" fill="#2a2a3e"/>
    <ellipse cx="100" cy="10" rx="20" ry="5" fill="#2a2a3e" stroke="${OUTLINE}" stroke-width="2"/>` },
};

function renderWearableLayers(equippedWear, charId) {
  if (!equippedWear) return '';
  const cats = ['clothes', 'makeup', 'accessories'];
  const layers = [];
  for (const cat of cats) {
    const id = equippedWear[cat];
    if (!id || !WEARABLE_DEFS[id]) continue;
    const def = WEARABLE_DEFS[id];
    layers.push({ z: def.z, html: `<div class="char-layer layer-wearable wear-${id}" style="z-index:${def.z}"><svg viewBox="0 0 200 270" class="char-part-svg char-wear-svg" xmlns="http://www.w3.org/2000/svg">${def.render(charId)}</svg></div>` });
  }
  return layers.sort((a, b) => a.z - b.z).map((l) => l.html).join('');
}

function getEquippedWearList(equippedWear) {
  if (!equippedWear) return [];
  return ['clothes', 'makeup', 'accessories'].map((c) => equippedWear[c]).filter(Boolean);
}
