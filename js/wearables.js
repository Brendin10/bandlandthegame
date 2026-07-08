// Shared little helpers for drawing wearables on the 200x270 character rig.
const WEAR_TORSO_PATH = 'M48 140 Q100 124 152 140 L146 188 Q100 200 54 188 Z';
const wearTorso = (fill, sw = 3) => `<path d="${WEAR_TORSO_PATH}" fill="${fill}" stroke="${OUTLINE}" stroke-width="${sw}"/>`;
const wearVest = (fill, sw = 3) => `
    <path d="M52 140 Q76 128 92 136 L90 190 Q68 194 56 188 Z" fill="${fill}" stroke="${OUTLINE}" stroke-width="${sw}"/>
    <path d="M148 140 Q124 128 108 136 L110 190 Q132 194 144 188 Z" fill="${fill}" stroke="${OUTLINE}" stroke-width="${sw}"/>`;
const wearStar = (cx, cy, rOuter, rInner = rOuter * 0.45) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? rInner : rOuter;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

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

  /* ---- Clothes (rockstar wardrobe) ---- */
  'ripped-skull-tee': { cat: 'clothes', z: 6, render: () => `
    ${wearTorso('#23232e')}
    <path d="M66 166 l9 -4 -6 8 10 -3" fill="none" stroke="#0d0d14" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M120 178 l9 -4 -6 8 10 -3" fill="none" stroke="#0d0d14" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="100" cy="160" r="11" fill="#f2f2f2"/>
    <circle cx="96" cy="158" r="2.6" fill="#23232e"/><circle cx="104" cy="158" r="2.6" fill="#23232e"/>
    <rect x="95" y="165" width="10" height="4" rx="1" fill="#23232e"/>
    <line x1="97.5" y1="165" x2="97.5" y2="169" stroke="#f2f2f2" stroke-width="1"/>
    <line x1="102.5" y1="165" x2="102.5" y2="169" stroke="#f2f2f2" stroke-width="1"/>` },
  'tie-dye-tee': { cat: 'clothes', z: 6, render: () => `
    ${wearTorso('#fdfdfd')}
    <circle cx="100" cy="164" r="26" fill="none" stroke="#FF6B9D" stroke-width="6" opacity="0.75"/>
    <circle cx="100" cy="164" r="18" fill="none" stroke="#FFB347" stroke-width="6" opacity="0.75"/>
    <circle cx="100" cy="164" r="11" fill="none" stroke="#6BCBFF" stroke-width="6" opacity="0.75"/>
    <circle cx="100" cy="164" r="4.5" fill="#9B6BFF" opacity="0.8"/>` },
  'grunge-flannel': { cat: 'clothes', z: 6, render: () => `
    ${wearTorso('#b3382c')}
    <line x1="72" y1="134" x2="72" y2="196" stroke="#6e1f18" stroke-width="7" opacity="0.55"/>
    <line x1="100" y1="128" x2="100" y2="202" stroke="#6e1f18" stroke-width="7" opacity="0.55"/>
    <line x1="128" y1="134" x2="128" y2="196" stroke="#6e1f18" stroke-width="7" opacity="0.55"/>
    <path d="M50 154 Q100 140 150 154" fill="none" stroke="#f2d16b" stroke-width="3" opacity="0.5"/>
    <path d="M52 176 Q100 164 148 176" fill="none" stroke="#f2d16b" stroke-width="3" opacity="0.5"/>
    <circle cx="100" cy="150" r="2" fill="#f8e6c8"/><circle cx="100" cy="168" r="2" fill="#f8e6c8"/><circle cx="100" cy="186" r="2" fill="#f8e6c8"/>` },
  'band-hoodie': { cat: 'clothes', z: 7, render: () => `
    <path d="M62 142 Q100 108 138 142 Q100 158 62 142 Z" fill="#43434f" stroke="${OUTLINE}" stroke-width="3"/>
    ${wearTorso('#565666')}
    <path d="M84 140 Q100 132 116 140" fill="none" stroke="#43434f" stroke-width="4"/>
    <line x1="92" y1="146" x2="92" y2="168" stroke="#e8e8e8" stroke-width="2.5"/>
    <line x1="108" y1="146" x2="108" y2="168" stroke="#e8e8e8" stroke-width="2.5"/>
    <circle cx="92" cy="170" r="2" fill="#e8e8e8"/><circle cx="108" cy="170" r="2" fill="#e8e8e8"/>
    <rect x="78" y="180" width="44" height="14" rx="6" fill="#4a4a58" stroke="${OUTLINE}" stroke-width="2"/>
    <text x="100" y="166" text-anchor="middle" fill="#FFD166" font-family="Fredoka,sans-serif" font-size="10" font-weight="700" opacity="0.9">BL</text>` },
  'denim-vest': { cat: 'clothes', z: 7, render: () => `
    ${wearVest('#4a6da7')}
    <path d="M58 148 Q72 142 86 146" fill="none" stroke="#d9e4f5" stroke-width="1.6" stroke-dasharray="3 3" opacity="0.8"/>
    <path d="M142 148 Q128 142 114 146" fill="none" stroke="#d9e4f5" stroke-width="1.6" stroke-dasharray="3 3" opacity="0.8"/>
    <polygon points="${wearStar(72, 168, 8)}" fill="#FFD166" stroke="${OUTLINE}" stroke-width="1.5"/>
    <rect x="118" y="162" width="16" height="12" rx="2" fill="#FF6B9D" stroke="${OUTLINE}" stroke-width="1.5"/>
    <circle cx="88" cy="150" r="2" fill="#c9d6ea"/><circle cx="112" cy="150" r="2" fill="#c9d6ea"/>` },
  'neon-windbreaker': { cat: 'clothes', z: 7, render: () => `
    ${wearTorso('#14141c')}
    <path d="M48 148 L152 142 L152 156 L48 162 Z" fill="#39FF14" opacity="0.85"/>
    <path d="M49 166 L151 160 L151 172 L50 178 Z" fill="#FF3D9A" opacity="0.85"/>
    <path d="M51 182 L149 176 L148 188 L52 192 Z" fill="#6BCBFF" opacity="0.85"/>
    <path d="M96 128 L104 128 L103 200 L97 200 Z" fill="#0c0c12"/>` },
  'world-tour-tee': { cat: 'clothes', z: 6, render: () => `
    ${wearTorso('#1c1c26')}
    <circle cx="100" cy="156" r="12" fill="none" stroke="#6BCBFF" stroke-width="2.5" opacity="0.9"/>
    <path d="M88 156 Q100 148 112 156 M88 156 Q100 164 112 156 M100 144 L100 168" fill="none" stroke="#6BCBFF" stroke-width="1.5" opacity="0.9"/>
    <text x="100" y="182" text-anchor="middle" fill="#FFD166" font-family="Fredoka,sans-serif" font-size="10" font-weight="700">WORLD TOUR</text>
    <polygon points="${wearStar(70, 148, 4)}" fill="#FF6B9D"/>
    <polygon points="${wearStar(130, 148, 4)}" fill="#FF6B9D"/>` },
  'leopard-shirt': { cat: 'clothes', z: 6, render: () => `
    ${wearTorso('#d9a556')}
    ${[[70,152],[92,144],[118,150],[138,160],[64,174],[88,168],[112,172],[134,182],[76,190],[102,188],[124,194]].map(([x,y]) => `
      <circle cx="${x}" cy="${y}" r="4.5" fill="#7a4a1e"/>
      <circle cx="${x - 1}" cy="${y - 1}" r="2" fill="#d9a556"/>`).join('')}` },
  'punk-plaid': { cat: 'clothes', z: 6, render: () => `
    ${wearTorso('#8c2f39')}
    <line x1="74" y1="132" x2="74" y2="198" stroke="#2b2b33" stroke-width="5" opacity="0.6"/>
    <line x1="126" y1="132" x2="126" y2="198" stroke="#2b2b33" stroke-width="5" opacity="0.6"/>
    <path d="M50 158 Q100 146 150 158" fill="none" stroke="#2b2b33" stroke-width="5" opacity="0.6"/>
    <path d="M52 180 Q100 170 148 180" fill="none" stroke="#e8d9a0" stroke-width="2" opacity="0.7"/>
    <line x1="100" y1="128" x2="100" y2="202" stroke="#e8d9a0" stroke-width="2" opacity="0.7"/>
    <g transform="rotate(-24 122 186)"><rect x="112" y="183" width="20" height="3" rx="1.5" fill="#c9c9d4" stroke="${OUTLINE}" stroke-width="1"/><circle cx="113" cy="188" r="3" fill="none" stroke="#c9c9d4" stroke-width="2"/></g>` },
  'fringe-jacket': { cat: 'clothes', z: 7, render: () => `
    ${wearTorso('#8a5a2b', 4)}
    <path d="M50 158 Q100 142 150 158" fill="none" stroke="#5e3a17" stroke-width="3"/>
    ${Array.from({ length: 11 }, (_, i) => {
      const x = 58 + i * 8.5;
      const y = 158 - Math.sin((i / 10) * Math.PI) * 12;
      return `<line x1="${x}" y1="${y.toFixed(1)}" x2="${x}" y2="${(y + 14).toFixed(1)}" stroke="#5e3a17" stroke-width="2.5" stroke-linecap="round"/>`;
    }).join('')}
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${58 + i * 8.5}" y1="192" x2="${58 + i * 8.5}" y2="204" stroke="#5e3a17" stroke-width="2.5" stroke-linecap="round"/>`).join('')}` },
  'studded-vest': { cat: 'clothes', z: 7, render: () => `
    ${wearVest('#1d1d26')}
    ${[[62,150],[72,146],[82,148],[62,164],[72,160],[82,162],[62,178],[72,174]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#c9c9d4" stroke="#8a8a96" stroke-width="0.8"/>`).join('')}
    ${[[138,150],[128,146],[118,148],[138,164],[128,160],[118,162],[138,178],[128,174]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#c9c9d4" stroke="#8a8a96" stroke-width="0.8"/>`).join('')}` },
  'velvet-blazer': { cat: 'clothes', z: 7, render: () => `
    ${wearTorso('#4a2a6e', 4)}
    <polygon points="84,136 100,132 92,164" fill="#341c50" stroke="${OUTLINE}" stroke-width="2"/>
    <polygon points="116,136 100,132 108,164" fill="#341c50" stroke="${OUTLINE}" stroke-width="2"/>
    <path d="M60 150 Q76 174 66 192" fill="none" stroke="#7a52a8" stroke-width="4" opacity="0.5" stroke-linecap="round"/>
    <circle cx="100" cy="176" r="3" fill="#FFD166" stroke="${OUTLINE}" stroke-width="1"/>` },
  'leather-jacket': { cat: 'clothes', z: 7, render: () => `
    ${wearTorso('#1d1d24', 4)}
    <polygon points="78,134 96,140 82,152" fill="#2c2c36" stroke="${OUTLINE}" stroke-width="2"/>
    <polygon points="122,134 104,140 118,152" fill="#2c2c36" stroke="${OUTLINE}" stroke-width="2"/>
    <line x1="100" y1="140" x2="112" y2="198" stroke="#b8b8c4" stroke-width="3"/>
    <circle cx="112" cy="198" r="2.5" fill="#b8b8c4"/>
    <path d="M60 160 L84 164 M60 172 L84 176" stroke="#3a3a46" stroke-width="2" stroke-dasharray="4 3"/>
    <path d="M140 160 L116 164 M140 172 L116 176" stroke="#3a3a46" stroke-width="2" stroke-dasharray="4 3"/>` },
  'sequin-top': { cat: 'clothes', z: 6, render: () => `
    ${wearTorso('#e75480')}
    ${[[70,148],[86,144],[102,142],[118,144],[134,148],[64,162],[80,158],[96,156],[112,158],[128,162],[142,166],[70,176],[86,172],[102,170],[118,172],[134,176],[78,188],[94,186],[110,188],[126,190]].map(([x,y], i) => `<circle cx="${x}" cy="${y}" r="2" fill="${i % 3 === 0 ? '#fff' : i % 3 === 1 ? '#FFD166' : '#ffb3cd'}" opacity="0.9"/>`).join('')}` },
  'glam-cape': { cat: 'clothes', z: 6, render: () => `
    <path d="M52 140 Q26 168 34 202 L58 192 Z" fill="#c9a6ff" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M148 140 Q174 168 166 202 L142 192 Z" fill="#c9a6ff" stroke="${OUTLINE}" stroke-width="3"/>
    ${wearTorso('#31214f')}
    <polygon points="${wearStar(100, 164, 12)}" fill="#FFD166" stroke="${OUTLINE}" stroke-width="1.5"/>
    <circle cx="70" cy="150" r="1.8" fill="#fff" opacity="0.9"/><circle cx="130" cy="150" r="1.8" fill="#fff" opacity="0.9"/>
    <circle cx="80" cy="184" r="1.8" fill="#fff" opacity="0.9"/><circle cx="120" cy="184" r="1.8" fill="#fff" opacity="0.9"/>` },
  'battle-vest': { cat: 'clothes', z: 7, render: () => `
    ${wearVest('#3a4a63')}
    <polygon points="56,140 62,124 68,140" fill="#c9c9d4" stroke="${OUTLINE}" stroke-width="1.5"/>
    <polygon points="70,138 76,124 82,140" fill="#c9c9d4" stroke="${OUTLINE}" stroke-width="1.5"/>
    <polygon points="144,140 138,124 132,140" fill="#c9c9d4" stroke="${OUTLINE}" stroke-width="1.5"/>
    <polygon points="130,138 124,124 118,140" fill="#c9c9d4" stroke="${OUTLINE}" stroke-width="1.5"/>
    <rect x="60" y="154" width="18" height="13" rx="2" fill="#FF3D5A" stroke="${OUTLINE}" stroke-width="1.5"/>
    <rect x="120" y="156" width="18" height="13" rx="2" fill="#39FF14" stroke="${OUTLINE}" stroke-width="1.5"/>
    <polygon points="${wearStar(69, 180, 6)}" fill="#FFD166" stroke="${OUTLINE}" stroke-width="1"/>
    <circle cx="129" cy="180" r="5" fill="#6BCBFF" stroke="${OUTLINE}" stroke-width="1.5"/>` },
  'tuxedo-rocker': { cat: 'clothes', z: 7, render: () => `
    ${wearTorso('#15151d', 4)}
    <polygon points="88,134 100,130 112,134 106,182 94,182" fill="#f4f0e8" stroke="${OUTLINE}" stroke-width="2"/>
    <polygon points="100,142 90,136 92,146" fill="#c0233a" stroke="${OUTLINE}" stroke-width="1.5"/>
    <polygon points="100,142 110,136 108,146" fill="#c0233a" stroke="${OUTLINE}" stroke-width="1.5"/>
    <circle cx="100" cy="142" r="2.4" fill="#8b1626" stroke="${OUTLINE}" stroke-width="1"/>
    <circle cx="100" cy="158" r="1.8" fill="#15151d"/><circle cx="100" cy="170" r="1.8" fill="#15151d"/>` },
  'white-jumpsuit': { cat: 'clothes', z: 7, render: () => `
    ${wearTorso('#f4f0e8', 4)}
    <polygon points="76,132 92,140 78,156" fill="#fffdf6" stroke="#d4a017" stroke-width="2.5"/>
    <polygon points="124,132 108,140 122,156" fill="#fffdf6" stroke="#d4a017" stroke-width="2.5"/>
    ${[[100,150],[92,160],[108,160],[86,172],[114,172],[100,166],[100,182]].map(([x,y], i) => `<circle cx="${x}" cy="${y}" r="2.2" fill="${['#FF3D5A', '#6BCBFF', '#FFD166'][i % 3]}"/>`).join('')}
    <rect x="56" y="184" width="88" height="8" rx="4" fill="#FFD166" stroke="${OUTLINE}" stroke-width="2"/>` },
  'gold-lame-suit': { cat: 'clothes', z: 7, render: () => `
    <defs><linearGradient id="goldLameGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe9a0"/><stop offset="45%" stop-color="#FFD166"/><stop offset="100%" stop-color="#c8901e"/></linearGradient></defs>
    <path d="${WEAR_TORSO_PATH}" fill="url(#goldLameGrad)" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M64 146 Q80 168 68 190" fill="none" stroke="#fff4cc" stroke-width="4" opacity="0.6" stroke-linecap="round"/>
    ${[[88,150],[116,156],[100,174],[130,178],[74,180]].map(([x,y]) => `<polygon points="${wearStar(x, y, 3.2)}" fill="#fff" opacity="0.9"/>`).join('')}` },
  'holo-jacket': { cat: 'clothes', z: 7, render: () => `
    <defs><linearGradient id="holoJackGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6BCBFF"/><stop offset="50%" stop-color="#9B6BFF"/><stop offset="100%" stop-color="#FF6B9D"/></linearGradient></defs>
    <path d="${WEAR_TORSO_PATH}" fill="url(#holoJackGrad)" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M56 150 Q100 132 144 150" fill="none" stroke="#fff" stroke-width="3" opacity="0.5"/>
    <path d="M58 176 Q100 160 142 176" fill="none" stroke="#fff" stroke-width="3" opacity="0.35"/>
    <polygon points="${wearStar(100, 168, 10)}" fill="#fff" opacity="0.95"/>` },

  /* ---- Makeup ---- */
  'glitter-eyes': { cat: 'makeup', z: 12, render: () => `
    <ellipse cx="78" cy="86" rx="19" ry="20" fill="none" stroke="#FFD166" stroke-width="3" opacity="0.85"/>
    <ellipse cx="122" cy="86" rx="19" ry="20" fill="none" stroke="#FF6B9D" stroke-width="3" opacity="0.85"/>
    ${[[70,78],[86,80],[74,92],[118,78],[134,80],[126,92]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.5" fill="#fff"/>`).join('')}` },
  'rock-star-face': { cat: 'makeup', z: 12, render: () => `
    <polygon points="100,72 108,88 124,88 112,98 116,114 100,106 84,114 88,98 76,88 92,88" fill="#FFD166" stroke="${OUTLINE}" stroke-width="2" opacity="0.9"/>
    <path d="M64 98 Q56 108 60 118" fill="none" stroke="#FF6B9D" stroke-width="3" stroke-linecap="round"/>
    <path d="M136 98 Q144 108 140 118" fill="none" stroke="#6BCBFF" stroke-width="3" stroke-linecap="round"/>` },
  'cat-eyeliner': { cat: 'makeup', z: 12, render: () => `
    <path d="M64 80 Q56 76 50 68" fill="none" stroke="#1a1a2e" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M136 80 Q144 76 150 68" fill="none" stroke="#1a1a2e" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M64 78 Q78 70 92 78" fill="none" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M108 78 Q122 70 136 78" fill="none" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round"/>` },
  'stage-blush': { cat: 'makeup', z: 12, render: () => `
    <ellipse cx="63" cy="104" rx="11" ry="6.5" fill="#ff7f9e" opacity="0.55"/>
    <ellipse cx="137" cy="104" rx="11" ry="6.5" fill="#ff7f9e" opacity="0.55"/>
    <circle cx="59" cy="102" r="1.6" fill="#fff" opacity="0.8"/>
    <circle cx="133" cy="102" r="1.6" fill="#fff" opacity="0.8"/>` },
  'heart-cheek': { cat: 'makeup', z: 12, render: () => `
    <path d="M63 99 c-3,-6 -12,-2 -8,5 c2,4 8,7 8,7 c0,0 6,-3 8,-7 c4,-7 -5,-11 -8,-5 Z" fill="#ff5b7f" stroke="${OUTLINE}" stroke-width="1.5" opacity="0.92"/>
    <circle cx="137" cy="104" r="2.5" fill="#ff5b7f" opacity="0.85"/>` },
  'star-cheeks': { cat: 'makeup', z: 12, render: () => `
    <polygon points="${wearStar(63, 103, 7)}" fill="#FFD166" stroke="${OUTLINE}" stroke-width="1.5" opacity="0.95"/>
    <polygon points="${wearStar(137, 103, 7)}" fill="#6BCBFF" stroke="${OUTLINE}" stroke-width="1.5" opacity="0.95"/>` },
  'glitter-tears': { cat: 'makeup', z: 12, render: () => `
    ${[[74,102],[77,110],[80,118],[122,102],[125,110],[128,118]].map(([x,y], i) => `<circle cx="${x}" cy="${y}" r="${2.2 - (i % 3) * 0.4}" fill="${i % 2 ? '#6BCBFF' : '#fff'}" opacity="0.95"/>`).join('')}
    <path d="M72 98 L76 122 M120 98 L124 122" stroke="#6BCBFF" stroke-width="1" opacity="0.4"/>` },
  'smoky-eyes': { cat: 'makeup', z: 12, render: () => `
    <ellipse cx="78" cy="86" rx="20" ry="15" fill="#2c2440" opacity="0.45"/>
    <ellipse cx="122" cy="86" rx="20" ry="15" fill="#2c2440" opacity="0.45"/>
    <path d="M60 96 Q68 102 76 100 M124 100 Q132 102 140 96" fill="none" stroke="#2c2440" stroke-width="3" opacity="0.4" stroke-linecap="round"/>` },
  'neon-warpaint': { cat: 'makeup', z: 12, render: () => `
    <path d="M52 96 l18 5" stroke="#39FF14" stroke-width="5" stroke-linecap="round"/>
    <path d="M53 106 l17 5" stroke="#FF3D9A" stroke-width="5" stroke-linecap="round"/>
    <path d="M148 96 l-18 5" stroke="#39FF14" stroke-width="5" stroke-linecap="round"/>
    <path d="M147 106 l-17 5" stroke="#FF3D9A" stroke-width="5" stroke-linecap="round"/>` },
  'punk-x-eye': { cat: 'makeup', z: 12, render: () => `
    <line x1="110" y1="72" x2="134" y2="100" stroke="#1a1a2e" stroke-width="4.5" stroke-linecap="round" opacity="0.9"/>
    <line x1="134" y1="72" x2="110" y2="100" stroke="#1a1a2e" stroke-width="4.5" stroke-linecap="round" opacity="0.9"/>` },
  'rainbow-arc': { cat: 'makeup', z: 12, render: () => `
    <path d="M54 74 Q100 46 146 74" fill="none" stroke="#FF3D5A" stroke-width="4" opacity="0.85"/>
    <path d="M58 78 Q100 52 142 78" fill="none" stroke="#FFD166" stroke-width="4" opacity="0.85"/>
    <path d="M62 82 Q100 58 138 82" fill="none" stroke="#6BCBFF" stroke-width="4" opacity="0.85"/>` },
  'ziggy-bolt': { cat: 'makeup', z: 12, render: () => `
    <polygon points="70,56 86,56 77,76 92,76 64,114 73,86 60,86" fill="#FF3D5A" stroke="#6BCBFF" stroke-width="2.5" opacity="0.95"/>` },
  'gold-shimmer': { cat: 'makeup', z: 12, render: () => `
    <path d="M58 72 Q68 66 80 70 M120 70 Q132 66 142 72" fill="none" stroke="#FFD166" stroke-width="3" opacity="0.8" stroke-linecap="round"/>
    ${[[60,100],[68,106],[76,102],[124,102],[132,106],[140,100],[100,118]].map(([x,y], i) => `<circle cx="${x}" cy="${y}" r="${1.4 + (i % 3) * 0.5}" fill="#FFD166" opacity="0.9"/>`).join('')}` },
  'flame-brows': { cat: 'makeup', z: 12, render: () => `
    <path d="M60 68 q5 -11 10 -1 q4 -9 8 0 q4 -7 9 1" fill="none" stroke="#ff7a1a" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M113 68 q5 -11 10 -1 q4 -9 8 0 q4 -7 9 1" fill="none" stroke="#ff7a1a" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M66 64 q3 -5 6 0 M119 64 q3 -5 6 0" fill="none" stroke="#FFD166" stroke-width="2" stroke-linecap="round"/>` },
  'tiger-stripes': { cat: 'makeup', z: 12, render: () => `
    <ellipse cx="100" cy="94" rx="46" ry="34" fill="#ff9a3c" opacity="0.22"/>
    <polygon points="54,84 72,88 54,93" fill="#1a1a2e" opacity="0.9"/>
    <polygon points="54,98 74,101 54,106" fill="#1a1a2e" opacity="0.9"/>
    <polygon points="146,84 128,88 146,93" fill="#1a1a2e" opacity="0.9"/>
    <polygon points="146,98 126,101 146,106" fill="#1a1a2e" opacity="0.9"/>
    <polygon points="92,64 100,74 108,64" fill="#1a1a2e" opacity="0.9"/>` },
  'galaxy-freckles': { cat: 'makeup', z: 12, render: () => `
    ${[[88,100],[96,104],[104,102],[112,100],[92,96],[108,96]].map(([x,y], i) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${i % 2 ? '#9B6BFF' : '#6BCBFF'}" opacity="0.9"/>`).join('')}
    <path d="M64 76 l2.5 5 5 .8 -3.6 3.6 .8 5 -4.7 -2.4 -4.7 2.4 .8 -5 -3.6 -3.6 5 -.8 Z" fill="#fff" opacity="0.9"/>
    <path d="M138 108 a5 5 0 1 1 -4 -8 a4 4 0 1 0 4 8 Z" fill="#FFD166" opacity="0.9"/>` },
  'checker-jaw': { cat: 'makeup', z: 12, render: () => `
    ${Array.from({ length: 14 }, (_, i) => {
      const col = i % 7;
      const row = Math.floor(i / 7);
      const x = 72 + col * 8;
      const y = 112 + row * 8;
      return (col + row) % 2 === 0 ? `<rect x="${x}" y="${y}" width="8" height="8" fill="#1a1a2e" opacity="0.85"/>` : `<rect x="${x}" y="${y}" width="8" height="8" fill="#f4f4f4" opacity="0.85"/>`;
    }).join('')}` },
  'red-bolt-cheeks': { cat: 'makeup', z: 12, render: () => `
    <polygon points="60,92 68,92 63,101 70,101 56,116 61,104 55,104" fill="#ff2e4d" opacity="0.95"/>
    <polygon points="132,92 140,92 135,101 142,101 128,116 133,104 127,104" fill="#ff2e4d" opacity="0.95"/>` },
  'mirror-gem': { cat: 'makeup', z: 12, render: () => `
    <polygon points="100,54 109,64 100,74 91,64" fill="#6BCBFF" stroke="#fff" stroke-width="2"/>
    <polygon points="100,58 105,64 100,70 95,64" fill="#cdeeff" opacity="0.9"/>
    ${[[84,60],[76,68],[116,60],[124,68]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#FFD166" opacity="0.9"/>`).join('')}` },
  'starchild-eye': { cat: 'makeup', z: 12, render: () => `
    <polygon points="${wearStar(78, 86, 24)}" fill="#1a1a2e" opacity="0.85"/>
    <polygon points="${wearStar(78, 86, 24)}" fill="none" stroke="#fff" stroke-width="2"/>
    <circle cx="78" cy="86" r="6.5" fill="#f4e3d0"/>
    <circle cx="78" cy="86" r="3" fill="#1a1a2e"/>` },
  'skull-paint': { cat: 'makeup', z: 12, render: () => `
    <ellipse cx="100" cy="92" rx="45" ry="40" fill="#f4f4f4" opacity="0.55"/>
    <ellipse cx="78" cy="86" rx="13" ry="14" fill="#1a1a2e" opacity="0.8"/>
    <ellipse cx="122" cy="86" rx="13" ry="14" fill="#1a1a2e" opacity="0.8"/>
    <polygon points="100,100 95,110 105,110" fill="#1a1a2e" opacity="0.8"/>
    ${[92, 97, 102, 107].map((x) => `<line x1="${x}" y1="116" x2="${x}" y2="126" stroke="#1a1a2e" stroke-width="2.5" opacity="0.8"/>`).join('')}
    <line x1="88" y1="121" x2="112" y2="121" stroke="#1a1a2e" stroke-width="2" opacity="0.8"/>` },
  'corpse-paint': { cat: 'makeup', z: 12, render: () => `
    <ellipse cx="100" cy="92" rx="46" ry="42" fill="#f4f4f4" opacity="0.7"/>
    <ellipse cx="78" cy="86" rx="15" ry="17" fill="#0d0d14" opacity="0.9"/>
    <ellipse cx="122" cy="86" rx="15" ry="17" fill="#0d0d14" opacity="0.9"/>
    <path d="M78 70 L78 62 M122 70 L122 62" stroke="#0d0d14" stroke-width="4" stroke-linecap="round"/>
    <path d="M92 116 Q100 122 108 116 L106 128 Q100 132 94 128 Z" fill="#0d0d14" opacity="0.85"/>` },

  /* ---- Accessories ---- */
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
  'hoop-earrings': { cat: 'accessories', z: 13, render: () => `
    <circle cx="56" cy="100" r="7" fill="none" stroke="#FFD166" stroke-width="3"/>
    <circle cx="144" cy="100" r="7" fill="none" stroke="#FFD166" stroke-width="3"/>
    <circle cx="53" cy="95" r="1.4" fill="#fff"/>
    <circle cx="141" cy="95" r="1.4" fill="#fff"/>` },
  'red-bandana': { cat: 'accessories', z: 14, render: () => `
    <path d="M58 66 Q100 50 142 66 L142 78 Q100 64 58 78 Z" fill="#c0392b" stroke="${OUTLINE}" stroke-width="3"/>
    ${[[74,66],[92,62],[110,62],[128,66]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff" opacity="0.9"/>`).join('')}
    <polygon points="142,70 156,64 150,78" fill="#c0392b" stroke="${OUTLINE}" stroke-width="2"/>
    <polygon points="142,72 154,80 144,84" fill="#a32e22" stroke="${OUTLINE}" stroke-width="2"/>` },
  'pick-necklace': { cat: 'accessories', z: 8, render: () => `
    <path d="M76 128 Q100 142 124 128" fill="none" stroke="#4a3120" stroke-width="2.5"/>
    <path d="M93 140 Q100 136 107 140 Q107 151 100 157 Q93 151 93 140 Z" fill="#FFD166" stroke="${OUTLINE}" stroke-width="2"/>
    <path d="M97 143 Q100 141 103 143" fill="none" stroke="#c8901e" stroke-width="1.5"/>` },
  'blue-beanie': { cat: 'accessories', z: 14, render: () => `
    <path d="M62 58 Q100 20 138 58 L138 72 Q100 58 62 72 Z" fill="#3e7cb1" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M62 62 Q100 48 138 62" fill="none" stroke="#2d5f8a" stroke-width="4"/>
    ${[74, 86, 98, 110, 122].map((x) => `<line x1="${x}" y1="40" x2="${x - 3}" y2="58" stroke="#2d5f8a" stroke-width="2" opacity="0.7"/>`).join('')}
    <circle cx="100" cy="22" r="7" fill="#f4f0e8" stroke="${OUTLINE}" stroke-width="2"/>` },
  'round-glasses': { cat: 'accessories', z: 13, render: () => `
    <circle cx="78" cy="86" r="13" fill="#ffb347" fill-opacity="0.3" stroke="#d4a017" stroke-width="2.5"/>
    <circle cx="122" cy="86" r="13" fill="#ffb347" fill-opacity="0.3" stroke="#d4a017" stroke-width="2.5"/>
    <line x1="91" y1="86" x2="109" y2="86" stroke="#d4a017" stroke-width="2.5"/>
    <line x1="65" y1="86" x2="52" y2="82" stroke="#d4a017" stroke-width="2"/>
    <line x1="135" y1="86" x2="148" y2="82" stroke="#d4a017" stroke-width="2"/>` },
  'backstage-pass': { cat: 'accessories', z: 8, render: () => `
    <path d="M80 126 L100 150 M120 126 L100 150" stroke="#1a1a2e" stroke-width="3"/>
    <rect x="86" y="150" width="28" height="20" rx="3" fill="#f4f0e8" stroke="${OUTLINE}" stroke-width="2"/>
    <rect x="86" y="150" width="28" height="6" fill="#FF3D9A"/>
    <text x="100" y="166" text-anchor="middle" fill="#1a1a2e" font-family="Fredoka,sans-serif" font-size="8" font-weight="700">VIP</text>` },
  'heart-glasses': { cat: 'accessories', z: 13, render: () => `
    <path d="M78 98 c-10,-8 -16,-14 -12,-20 c3,-5 10,-4 12,1 c2,-5 9,-6 12,-1 c4,6 -2,12 -12,20 Z" fill="#ff5b7f" fill-opacity="0.85" stroke="${OUTLINE}" stroke-width="2"/>
    <path d="M122 98 c-10,-8 -16,-14 -12,-20 c3,-5 10,-4 12,1 c2,-5 9,-6 12,-1 c4,6 -2,12 -12,20 Z" fill="#ff5b7f" fill-opacity="0.85" stroke="${OUTLINE}" stroke-width="2"/>
    <line x1="90" y1="84" x2="110" y2="84" stroke="${OUTLINE}" stroke-width="2.5"/>` },
  'studded-choker': { cat: 'accessories', z: 8, render: () => `
    <path d="M76 124 Q100 136 124 124 L124 132 Q100 144 76 132 Z" fill="#1a1a2e" stroke="${OUTLINE}" stroke-width="2"/>
    ${[[82,128],[91,132],[100,134],[109,132],[118,128]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#c9c9d4" stroke="#8a8a96" stroke-width="0.8"/>`).join('')}` },
  'silk-scarf': { cat: 'accessories', z: 8, render: () => `
    <path d="M74 126 Q100 140 126 126 L126 136 Q100 150 74 136 Z" fill="#c0233a" stroke="${OUTLINE}" stroke-width="2.5"/>
    <path d="M88 138 Q84 160 90 182 L100 180 Q94 158 98 140 Z" fill="#c0233a" stroke="${OUTLINE}" stroke-width="2.5"/>
    <path d="M90 148 Q92 162 91 174" fill="none" stroke="#8b1626" stroke-width="2" opacity="0.7"/>` },
  'black-beret': { cat: 'accessories', z: 14, render: () => `
    <g transform="rotate(-8 100 44)">
      <ellipse cx="100" cy="44" rx="37" ry="15" fill="#2f2f3a" stroke="${OUTLINE}" stroke-width="3"/>
      <ellipse cx="100" cy="40" rx="26" ry="9" fill="#3c3c4a"/>
      <line x1="100" y1="31" x2="100" y2="24" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/>
    </g>` },
  'aviator-shades': { cat: 'accessories', z: 13, render: () => `
    <path d="M58 80 Q78 76 96 80 L94 98 Q78 106 62 96 Z" fill="#b06a2c" fill-opacity="0.75" stroke="#d4a017" stroke-width="2.5"/>
    <path d="M142 80 Q122 76 104 80 L106 98 Q122 106 138 96 Z" fill="#b06a2c" fill-opacity="0.75" stroke="#d4a017" stroke-width="2.5"/>
    <path d="M96 80 Q100 78 104 80" fill="none" stroke="#d4a017" stroke-width="3"/>
    <line x1="58" y1="82" x2="48" y2="78" stroke="#d4a017" stroke-width="2"/>
    <line x1="142" y1="82" x2="152" y2="78" stroke="#d4a017" stroke-width="2"/>
    <path d="M64 84 Q72 81 80 84" fill="none" stroke="#fff" stroke-width="2" opacity="0.5"/>` },
  'eye-patch': { cat: 'accessories', z: 13, render: () => `
    <ellipse cx="122" cy="86" rx="15" ry="13" fill="#14141c" stroke="${OUTLINE}" stroke-width="2.5"/>
    <line x1="108" y1="80" x2="54" y2="66" stroke="#14141c" stroke-width="3.5"/>
    <line x1="136" y1="80" x2="150" y2="72" stroke="#14141c" stroke-width="3.5"/>
    <path d="M116 82 Q122 79 128 82" fill="none" stroke="#3c3c4a" stroke-width="2"/>` },
  'cowboy-hat': { cat: 'accessories', z: 14, render: () => `
    <path d="M52 56 Q54 66 74 64 L126 64 Q146 66 148 56 Q128 50 124 52 L76 52 Q72 50 52 56 Z" fill="#8a5a2b" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M74 54 Q76 22 100 22 Q124 22 126 54 Z" fill="#8a5a2b" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M74 50 L126 50 L126 58 L74 58 Z" fill="#5e3a17"/>
    <path d="M96 22 Q100 30 104 22" fill="none" stroke="#5e3a17" stroke-width="2.5"/>
    <circle cx="100" cy="54" r="2.5" fill="#FFD166" stroke="${OUTLINE}" stroke-width="1"/>` },
  'headset-mic': { cat: 'accessories', z: 13, render: () => `
    <path d="M56 88 Q52 112 84 114" fill="none" stroke="#2a2a36" stroke-width="3.5"/>
    <circle cx="56" cy="90" r="6" fill="#2a2a36" stroke="${OUTLINE}" stroke-width="2"/>
    <circle cx="88" cy="114" r="5" fill="#3c3c4a" stroke="${OUTLINE}" stroke-width="2"/>
    <circle cx="88" cy="114" r="2" fill="#39FF14"/>` },
  'dj-headphones': { cat: 'accessories', z: 14, render: () => `
    <path d="M56 66 Q100 24 144 66" fill="none" stroke="#22222c" stroke-width="7" stroke-linecap="round"/>
    <rect x="48" y="72" width="17" height="27" rx="7" fill="#22222c" stroke="${OUTLINE}" stroke-width="2.5"/>
    <rect x="135" y="72" width="17" height="27" rx="7" fill="#22222c" stroke="${OUTLINE}" stroke-width="2.5"/>
    <rect x="52" y="78" width="9" height="15" rx="4" fill="#FF3D9A"/>
    <rect x="139" y="78" width="9" height="15" rx="4" fill="#FF3D9A"/>` },
  'devil-horns': { cat: 'accessories', z: 14, render: () => `
    <path d="M72 48 Q64 26 78 16 Q76 34 86 44 Z" fill="#d3303e" stroke="${OUTLINE}" stroke-width="2.5"/>
    <path d="M128 48 Q136 26 122 16 Q124 34 114 44 Z" fill="#d3303e" stroke="${OUTLINE}" stroke-width="2.5"/>
    <path d="M76 24 Q75 32 80 38" fill="none" stroke="#ff7a85" stroke-width="2" opacity="0.8"/>
    <path d="M124 24 Q125 32 120 38" fill="none" stroke="#ff7a85" stroke-width="2" opacity="0.8"/>` },
  'feather-boa': { cat: 'accessories', z: 8, render: () => `
    ${Array.from({ length: 11 }, (_, i) => {
      const t = i / 10;
      const x = 58 + t * 84;
      const y = 134 + Math.sin(t * Math.PI) * 14;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="${i % 2 ? '#FF3D9A' : '#ff7ec0'}" opacity="0.95"/>`;
    }).join('')}
    ${Array.from({ length: 6 }, (_, i) => {
      const t = i / 5;
      const x = 62 + t * 76;
      const y = 130 + Math.sin(t * Math.PI) * 14;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#ffd3e8" opacity="0.9"/>`;
    }).join('')}` },
  'star-glasses': { cat: 'accessories', z: 13, render: () => `
    <polygon points="${wearStar(78, 86, 18)}" fill="#FFD166" stroke="${OUTLINE}" stroke-width="2"/>
    <polygon points="${wearStar(122, 86, 18)}" fill="#FFD166" stroke="${OUTLINE}" stroke-width="2"/>
    <circle cx="78" cy="86" r="6" fill="#fff" opacity="0.5"/>
    <circle cx="122" cy="86" r="6" fill="#fff" opacity="0.5"/>
    <line x1="92" y1="84" x2="108" y2="84" stroke="${OUTLINE}" stroke-width="2.5"/>` },
  'spiked-mohawk': { cat: 'accessories', z: 14, render: () => `
    ${[[68,52,58,14],[82,46,78,6],[100,44,100,2],[118,46,122,6],[132,52,142,14]].map(([bx, by, tx, ty]) => `
      <polygon points="${bx - 7},${by} ${tx},${ty} ${bx + 7},${by}" fill="#39FF14" stroke="${OUTLINE}" stroke-width="2.5"/>`).join('')}
    <path d="M60 54 Q100 38 140 54" fill="none" stroke="${OUTLINE}" stroke-width="3"/>` },
  'rock-crown': { cat: 'accessories', z: 14, render: () => `
    <polygon points="68,52 68,28 82,42 100,20 118,42 132,28 132,52" fill="#FFD166" stroke="${OUTLINE}" stroke-width="3"/>
    <rect x="66" y="48" width="68" height="10" rx="3" fill="#c8901e" stroke="${OUTLINE}" stroke-width="2.5"/>
    <circle cx="100" cy="30" r="3.5" fill="#FF3D5A" stroke="${OUTLINE}" stroke-width="1.5"/>
    <circle cx="82" cy="53" r="2.5" fill="#6BCBFF"/>
    <circle cx="100" cy="53" r="2.5" fill="#39FF14"/>
    <circle cx="118" cy="53" r="2.5" fill="#FF3D9A"/>` },
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
