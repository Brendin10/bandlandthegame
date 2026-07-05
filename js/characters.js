const OUTLINE = '#1C1230';

function furTufts(cx, cy, color, count = 6, spread = 14) {
  return Array.from({ length: count }, (_, i) => {
    const ang = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(ang) * spread;
    const y = cy + Math.sin(ang) * (spread * 0.65);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${color}" stroke="${OUTLINE}" stroke-width="1.5"/>`;
  }).join('');
}

function happyFace(eyeColor, mouthY = 112) {
  return `
    <ellipse cx="78" cy="84" rx="18" ry="19" fill="white" stroke="${OUTLINE}" stroke-width="3"/>
    <ellipse cx="122" cy="84" rx="18" ry="19" fill="white" stroke="${OUTLINE}" stroke-width="3"/>
    <ellipse cx="80" cy="86" rx="11" ry="12" fill="${eyeColor}"/>
    <ellipse cx="124" cy="86" rx="11" ry="12" fill="${eyeColor}"/>
    <circle cx="74" cy="78" r="6" fill="white"/>
    <circle cx="118" cy="78" r="6" fill="white"/>
    <circle cx="84" cy="90" r="3.5" fill="white"/>
    <circle cx="128" cy="90" r="3.5" fill="white"/>
    <path d="M70 74 Q78 66 86 74" fill="none" stroke="${OUTLINE}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M114 74 Q122 66 130 74" fill="none" stroke="${OUTLINE}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M72 ${mouthY - 6} Q100 ${mouthY + 14} 128 ${mouthY - 6}" fill="#FF8EC8" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M82 ${mouthY + 2} Q100 ${mouthY + 10} 118 ${mouthY + 2}" fill="white" stroke="${OUTLINE}" stroke-width="2"/>
    <ellipse cx="100" cy="${mouthY + 6}" rx="7" ry="4" fill="#FF6B9D"/>
    <circle cx="62" cy="100" r="10" fill="#FF78B4" opacity="0.55"/>
    <circle cx="138" cy="100" r="10" fill="#FF78B4" opacity="0.55"/>`;
}

function charSvg(inner, cls = '') {
  return `<svg viewBox="0 0 200 270" class="char-part-svg ${cls}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

function charLayer(name, z, inner, extra = '') {
  return `<div class="char-layer layer-${name} ${extra}" style="z-index:${z}">${charSvg(inner)}</div>`;
}

function extractSvgInners(html) {
  if (!html) return '';
  const parts = [];
  const re = /<svg[^>]*>([\s\S]*?)<\/svg>/g;
  let match = re.exec(html);
  while (match) {
    parts.push(match[1]);
    match = re.exec(html);
  }
  return parts.join('');
}

function layeredCharacter(id, size, layers, frontArmsHtml, instrumentHtml = '', wearHtml = '', backArmsHtml = '') {
  const h = size * 1.35;

  if (instrumentHtml && frontArmsHtml) {
    const bodyParts = layers.map((layerHtml) => extractSvgInners(layerHtml)).join('');
    const wearInner = extractSvgInners(wearHtml);
    const backArms = backArmsHtml ? `<g class="play-arms-back rigged-arms">${backArmsHtml}</g>` : '';
    return `<div class="character-layered ${id}-layered play-unified" style="width:${size}px;height:${h}px" aria-label="${id}">
      <svg viewBox="0 0 200 270" class="char-part-svg char-unified-svg" xmlns="http://www.w3.org/2000/svg">
        ${bodyParts}${wearInner}
        ${backArms}
        <g class="play-instrument">${instrumentHtml}</g>
        <g class="play-arms-front rigged-arms">${frontArmsHtml}</g>
      </svg>
    </div>`;
  }

  const instLayer = instrumentHtml
    ? `<div class="char-layer layer-instrument" style="z-index:13">${charSvg(instrumentHtml)}</div>`
    : '';
  const frontArms = frontArmsHtml
    ? `<div class="char-layer layer-arms-front rigged-arms" style="z-index:15">${charSvg(frontArmsHtml)}</div>`
    : '';
  return `<div class="character-layered ${id}-layered" style="width:${size}px;height:${h}px" aria-label="${id}">
    ${layers.join('')}${wearHtml}${instLayer}${frontArms}
  </div>`;
}

function rigArmsLayer(z, pose, layer, colors, options = {}) {
  const inner = typeof CharacterRig !== 'undefined'
    ? CharacterRig.renderRiggedArms(colors, pose, layer, options)
    : `<ellipse cx="${layer === 'back' ? 38 : 42}" cy="168" rx="16" ry="18" fill="${colors.fur}" stroke="${OUTLINE}" stroke-width="3"/>`;
  return charLayer(`arms-${layer}`, z, inner, 'rigged-arms');
}

function characterColors(id) {
  if (id === 'benny') {
    return typeof CharacterRig !== 'undefined' ? CharacterRig.bennyColors() : { fur: '#8E58FF', furLight: '#BC94FF', hand: '#D2B2FF' };
  }
  return typeof CharacterRig !== 'undefined' ? CharacterRig.lizzyColors() : { fur: '#9458FF', furLight: '#C29AFF', hand: '#DAB6FF' };
}

function rigOptionsForInst(inst) {
  return {
    hideSticks: inst && typeof InstrumentArt !== 'undefined' && InstrumentArt.shouldHideSticks(inst),
  };
}

function frontArmsForCharacter(id, pose, inst) {
  const colors = characterColors(id);
  const hideSticks = rigOptionsForInst(inst).hideSticks;
  return typeof CharacterRig !== 'undefined'
    ? CharacterRig.renderRiggedArms(colors, pose, 'front', { hideSticks })
    : '';
}

function backArmsForCharacter(id, pose, inst) {
  if (!inst) return '';
  const colors = characterColors(id);
  return typeof CharacterRig !== 'undefined'
    ? CharacterRig.renderRiggedArms(colors, pose, 'back', rigOptionsForInst(inst))
    : '';
}

const BENNY_LAYERS = (size, pose = 'idle', inst = null) => {
  const s = size;
  const colors = typeof CharacterRig !== 'undefined' ? CharacterRig.bennyColors() : { fur: '#8E58FF' };
  const hideSticks = inst && typeof InstrumentArt !== 'undefined' && InstrumentArt.shouldHideSticks(inst);
  return [
    charLayer('shadow', 1, `<ellipse cx="100" cy="252" rx="50" ry="9" fill="rgba(0,0,0,0.22)"/>`),
    charLayer('legs', 2, `
      <rect x="58" y="210" width="26" height="32" rx="12" fill="#5230A0" stroke="${OUTLINE}" stroke-width="3"/>
      <rect x="116" y="210" width="26" height="32" rx="12" fill="#5230A0" stroke="${OUTLINE}" stroke-width="3"/>
      <ellipse cx="71" cy="238" rx="13" ry="7" fill="#6234BC" stroke="${OUTLINE}" stroke-width="2"/>
      <ellipse cx="129" cy="238" rx="13" ry="7" fill="#6234BC" stroke="${OUTLINE}" stroke-width="2"/>
      <rect x="62" y="218" width="8" height="14" rx="3" fill="#8E58FF" opacity="0.5"/>
      <rect x="120" y="218" width="8" height="14" rx="3" fill="#8E58FF" opacity="0.5"/>`),
    charLayer('body', 3, `
      <ellipse cx="100" cy="165" rx="56" ry="48" fill="#7E48EF" stroke="${OUTLINE}" stroke-width="4"/>
      <ellipse cx="100" cy="168" rx="44" ry="38" fill="#8E58FF"/>
      <ellipse cx="100" cy="174" rx="30" ry="24" fill="#BC94FF"/>
      <ellipse cx="100" cy="178" rx="20" ry="16" fill="#D2B2FF"/>
      ${furTufts(100, 162, '#9E68FF', 8, 34)}`),
    ...(inst ? [] : [rigArmsLayer(4, pose, 'back', colors, { hideSticks })]),
    charLayer('jacket', 6, `
      <path d="M44 138 Q100 120 156 138 L152 192 Q100 204 48 192 Z" fill="#5a3420" stroke="${OUTLINE}" stroke-width="4"/>
      <path d="M56 144 Q100 130 144 144 L140 184 Q100 194 60 184 Z" fill="#764426"/>
      <path d="M58 148 Q100 136 142 148 L138 178 Q100 186 62 178 Z" fill="#A86C3A"/>
      <rect x="92" y="130" width="16" height="58" rx="3" fill="#583018" stroke="${OUTLINE}" stroke-width="2"/>
      <path d="M48 142 L62 158 L56 172 Z" fill="#A86C3A" stroke="${OUTLINE}" stroke-width="2"/>
      <path d="M152 142 L138 158 L144 172 Z" fill="#A86C3A" stroke="${OUTLINE}" stroke-width="2"/>
      <ellipse cx="70" cy="156" rx="11" ry="10" fill="#F8F2E6" stroke="${OUTLINE}" stroke-width="2"/>
      <line x1="66" y1="154" x2="74" y2="160" stroke="${OUTLINE}" stroke-width="2"/>
      <rect x="88" y="128" width="24" height="8" rx="3" fill="#6a4828" stroke="${OUTLINE}" stroke-width="1"/>`),
    charLayer('head', 7, `
      <ellipse cx="100" cy="92" rx="54" ry="52" fill="#7E48EF" stroke="${OUTLINE}" stroke-width="4"/>
      <ellipse cx="100" cy="96" rx="44" ry="42" fill="#8E58FF"/>
      <ellipse cx="100" cy="100" rx="34" ry="32" fill="#BC94FF" opacity="0.55"/>
      ${furTufts(100, 58, '#9E68FF', 7, 30)}`),
    charLayer('horns', 8, `
      <polygon points="66,48 58,14 80,32" fill="#C89848" stroke="${OUTLINE}" stroke-width="3"/>
      <polygon points="66,48 64,32 76,40" fill="#D6A860"/>
      <polygon points="134,48 142,14 120,32" fill="#C89848" stroke="${OUTLINE}" stroke-width="3"/>
      <polygon points="134,48 136,32 124,40" fill="#D6A860"/>`),
    charLayer('hair', 9, `
      <circle cx="54" cy="72" r="7" fill="#8E58FF" stroke="${OUTLINE}" stroke-width="2"/>
      <circle cx="146" cy="72" r="7" fill="#8E58FF" stroke="${OUTLINE}" stroke-width="2"/>
      <circle cx="72" cy="50" r="6" fill="#9E68FF" stroke="${OUTLINE}" stroke-width="2"/>
      <circle cx="128" cy="50" r="6" fill="#9E68FF" stroke="${OUTLINE}" stroke-width="2"/>
      <ellipse cx="48" cy="82" rx="10" ry="8" fill="#7E48EF" stroke="${OUTLINE}" stroke-width="2"/>
      <ellipse cx="152" cy="82" rx="10" ry="8" fill="#7E48EF" stroke="${OUTLINE}" stroke-width="2"/>`),
    charLayer('face', 10, happyFace('#1478C8', 114)),
  ];
};

const LIZZY_LAYERS = (pose = 'idle', inst = null) => {
  const colors = typeof CharacterRig !== 'undefined' ? CharacterRig.lizzyColors() : { fur: '#9458FF' };
  const hideSticks = inst && typeof InstrumentArt !== 'undefined' && InstrumentArt.shouldHideSticks(inst);
  return [
  charLayer('shadow', 1, `<ellipse cx="100" cy="252" rx="50" ry="9" fill="rgba(0,0,0,0.22)"/>`),
  charLayer('hair-back', 2, `
    <path d="M78 44 Q62 90 70 130 Q76 100 84 70 Q90 52 100 42" fill="#B028D8" stroke="${OUTLINE}" stroke-width="3"/>
    <path d="M122 44 Q138 90 130 130 Q124 100 116 70 Q110 52 100 42" fill="#B028D8" stroke="${OUTLINE}" stroke-width="3"/>
    <ellipse cx="100" cy="28" rx="28" ry="32" fill="#C838F0" stroke="${OUTLINE}" stroke-width="4"/>
    <ellipse cx="100" cy="32" rx="20" ry="24" fill="#DC48FF"/>`),
  charLayer('legs', 3, `
    <rect x="58" y="210" width="26" height="32" rx="12" fill="#5630B0" stroke="${OUTLINE}" stroke-width="3"/>
    <rect x="116" y="210" width="26" height="32" rx="12" fill="#5630B0" stroke="${OUTLINE}" stroke-width="3"/>
    <ellipse cx="71" cy="238" rx="13" ry="7" fill="#6638C0" stroke="${OUTLINE}" stroke-width="2"/>
    <ellipse cx="129" cy="238" rx="13" ry="7" fill="#6638C0" stroke="${OUTLINE}" stroke-width="2"/>`),
    charLayer('body', 4, `
      <ellipse cx="100" cy="166" rx="54" ry="46" fill="#8450EF" stroke="${OUTLINE}" stroke-width="4"/>
      <ellipse cx="100" cy="170" rx="42" ry="36" fill="#9458FF"/>
      <ellipse cx="100" cy="176" rx="28" ry="22" fill="#C29AFF"/>
      <ellipse cx="100" cy="180" rx="18" ry="14" fill="#DAB6FF"/>
      ${furTufts(100, 164, '#B878FF', 8, 32)}`),
  ...(inst ? [] : [rigArmsLayer(5, pose, 'back', colors, { hideSticks })]),
  charLayer('jacket', 7, `
    <path d="M46 140 Q100 122 154 140 L150 190 Q100 202 52 190 Z" fill="#E05098" stroke="${OUTLINE}" stroke-width="4"/>
    <path d="M58 146 Q100 132 142 146 L138 180 Q100 190 62 180 Z" fill="#FF6CB2"/>
    <path d="M62 150 Q100 138 138 150 L134 174 Q100 182 66 174 Z" fill="#FF9ECE"/>
    <rect x="92" y="132" width="16" height="52" rx="3" fill="#E64696" stroke="${OUTLINE}" stroke-width="2"/>
    <path d="M50 144 L64 160 L58 176 Z" fill="#FF9ECE" stroke="${OUTLINE}" stroke-width="2"/>
    <ellipse cx="132" cy="154" rx="9" ry="8" fill="#281638" stroke="${OUTLINE}" stroke-width="2"/>
    <rect x="86" y="128" width="28" height="8" rx="3" fill="#FF8EC8" stroke="${OUTLINE}" stroke-width="1"/>`),
    charLayer('head', 8, `
      <ellipse cx="100" cy="94" rx="52" ry="50" fill="#8450EF" stroke="${OUTLINE}" stroke-width="4"/>
      <ellipse cx="100" cy="98" rx="42" ry="40" fill="#9458FF"/>
      <ellipse cx="100" cy="102" rx="32" ry="30" fill="#C29AFF" opacity="0.5"/>
      ${furTufts(100, 60, '#B878FF', 7, 28)}`),
  charLayer('horns', 9, `
    <polygon points="72,54 66,30 84,42" fill="#D6A860" stroke="${OUTLINE}" stroke-width="3"/>
    <polygon points="128,54 134,30 116,42" fill="#D6A860" stroke="${OUTLINE}" stroke-width="3"/>`),
  charLayer('hair-front', 10, `
    <circle cx="56" cy="76" r="7" fill="#9458FF" stroke="${OUTLINE}" stroke-width="2"/>
    <circle cx="144" cy="76" r="7" fill="#9458FF" stroke="${OUTLINE}" stroke-width="2"/>
    <ellipse cx="100" cy="38" rx="22" ry="18" fill="#F882FF" opacity="0.7"/>`),
    charLayer('face', 11, `
      ${happyFace('#C83CB4', 116)}
      <path d="M58 80 L52 68" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/>
      <path d="M142 80 L148 68" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/>`),
];
};

const CHARACTERS = {
  benny: {
    id: 'benny',
    name: 'Benny',
    tagline: 'Purple powerhouse. Chunky biker fuzz.',
    render(size = 200, pose = 'idle') {
      return layeredCharacter('benny', size, BENNY_LAYERS(size, pose), frontArmsForCharacter('benny', pose));
    },
  },
  lizzy: {
    id: 'lizzy',
    name: 'Lizzy',
    tagline: 'Pink jacket queen. Ponytail puff.',
    render(size = 200, pose = 'idle') {
      return layeredCharacter('lizzy', size, LIZZY_LAYERS(pose), frontArmsForCharacter('lizzy', pose));
    },
  },
};

function renderCharacter(id, size, opts = {}) {
  const char = CHARACTERS[id];
  if (!char) return '';
  const playPose = opts.instrument && typeof CharacterRig !== 'undefined'
    ? CharacterRig.poseFromInstrument(opts.instrument)
    : 'idle';
  const instInner = opts.instrument ? renderHeldInstrumentInner(opts.instrument, opts.pose || 'idle') : '';
  const wearHtml = typeof renderWearableLayers === 'function' ? renderWearableLayers(opts.equippedWear, id) : '';
  const frontArms = frontArmsForCharacter(id, playPose, opts.instrument);
  const backArms = backArmsForCharacter(id, playPose, opts.instrument);
  if (id === 'benny') return layeredCharacter('benny', size, BENNY_LAYERS(size, playPose, opts.instrument), frontArms, instInner, wearHtml, backArms);
  return layeredCharacter('lizzy', size, LIZZY_LAYERS(playPose, opts.instrument), frontArms, instInner, wearHtml, backArms);
}

function renderCrowdMember(index) {
  const colors = ['#FF6B9D', '#6BCBFF', '#FFD166', '#95E06C', '#C77DFF'];
  const c = colors[index % colors.length];
  const light = c;
  return `
    <svg viewBox="0 0 40 50" width="32" height="40" class="crowd-member">
      <ellipse cx="20" cy="38" rx="14" ry="8" fill="#3C3250" stroke="#1C1230" stroke-width="2"/>
      <ellipse cx="20" cy="16" rx="13" ry="14" fill="${c}" stroke="#1C1230" stroke-width="2"/>
      <ellipse cx="20" cy="14" rx="11" ry="11" fill="${light}" opacity="0.85"/>
      <circle cx="12" cy="8" r="3" fill="${c}" stroke="#1C1230" stroke-width="1"/>
      <circle cx="28" cy="8" r="3" fill="${c}" stroke="#1C1230" stroke-width="1"/>
      <circle cx="20" cy="4" r="3" fill="${c}" stroke="#1C1230" stroke-width="1"/>
      <rect x="10" y="18" width="20" height="18" rx="5" fill="${c}" stroke="#1C1230" stroke-width="2"/>
      <ellipse cx="15" cy="14" rx="3" ry="3.5" fill="white" stroke="#1C1230" stroke-width="1"/>
      <ellipse cx="25" cy="14" rx="3" ry="3.5" fill="white" stroke="#1C1230" stroke-width="1"/>
      <circle cx="15" cy="14" r="1.5" fill="#2D1B69"/>
      <circle cx="25" cy="14" r="1.5" fill="#2D1B69"/>
      <path d="M14 19 Q20 23 26 19" fill="none" stroke="#1C1230" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `;
}
