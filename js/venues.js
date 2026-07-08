function layerSvg(content, extraClass = '') {
  return `<svg class="venue-layer-svg ${extraClass}" viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
}

function backdropLayers(venueId, layers) {
  const names = ['far', 'mid', 'near', 'front', 'decor'];
  const html = layers.map((content, i) =>
    `<div class="backdrop-layer layer-${names[i]}">${layerSvg(content)}</div>`
  ).join('');
  return `<div class="venue-backdrop venue-${venueId}" data-venue="${venueId}" aria-hidden="true">${html}<div class="backdrop-vignette"></div></div>`;
}

/* ---------- Decor layer: guitar case + on-brand set dressing ----------
 * A fifth, closest-to-camera layer that sits in front of everything else.
 * Every venue gets the same open guitar case (the busking "tip jar")
 * front-and-center, flanked by two venue-themed props. Handcrafted venues
 * get hand-picked props; procedurally generated venues get a medallion of
 * their own emoji (guaranteed on-brand) plus a prop matched by keywords in
 * their name, so every stage - even the auto-generated ones - reads as
 * decorated for that specific place rather than reused generic dressing. */

function svgGuitarCase(cx = 400, cy = 380, scale = 0.9) {
  return `
    <g transform="translate(${cx},${cy}) scale(${scale})">
      <ellipse cx="0" cy="26" rx="88" ry="13" fill="rgba(0,0,0,0.3)"/>
      <path d="M-76,-4 L-68,-54 Q-68,-60 -58,-60 L56,-60 Q66,-60 64,-52 L76,-4 Z" fill="#3a2418" stroke="#22140c" stroke-width="3"/>
      <path d="M-66,-8 L-60,-50 Q-60,-54 -53,-54 L50,-54 Q58,-54 56,-47 L66,-8 Z" fill="#7a1f2e"/>
      <path d="M-80,-2 Q-80,6 -74,8 L-48,20 Q0,29 48,20 L74,8 Q80,6 80,-2 Q56,10 0,10 Q-56,10 -80,-2 Z" fill="#2a1810" stroke="#1a0e08" stroke-width="3"/>
      <ellipse cx="0" cy="-2" rx="78" ry="14" fill="#4a2c1c" stroke="#1a0e08" stroke-width="3"/>
      <ellipse cx="0" cy="-2" rx="66" ry="10" fill="#8a1f30"/>
      <ellipse cx="-18" cy="-2" rx="16" ry="6" fill="#6b1522" opacity="0.6"/>
      <ellipse cx="22" cy="-2" rx="22" ry="7" fill="#6b1522" opacity="0.6"/>
      <ellipse cx="-8" cy="0" rx="6" ry="2.6" fill="#ffd166" stroke="#c99a30" stroke-width="1"/>
      <ellipse cx="4" cy="2" rx="5.5" ry="2.4" fill="#e8c070" stroke="#c99a30" stroke-width="1"/>
      <rect x="-30" y="-4" width="16" height="8" rx="1.5" fill="#8fce8f" stroke="#4a8a4a" stroke-width="1" transform="rotate(-8 -22 0)"/>
      <rect x="16" y="-3" width="15" height="7.5" rx="1.5" fill="#8fce8f" stroke="#4a8a4a" stroke-width="1" transform="rotate(10 23 1)"/>
      <ellipse cx="30" cy="1" rx="4.5" ry="2" fill="#ffd166" stroke="#c99a30" stroke-width="1"/>
    </g>`;
}

function svgEmojiMedallion(cx, cy, emoji, accent = '#d4a050') {
  return `
    <g transform="translate(${cx},${cy})">
      <ellipse cx="0" cy="4" rx="20" ry="6" fill="rgba(0,0,0,0.22)"/>
      <rect x="-4" y="-64" width="8" height="64" fill="#4a3020"/>
      <circle cx="0" cy="-78" r="34" fill="#3a2418" stroke="${accent}" stroke-width="4"/>
      <circle cx="0" cy="-78" r="26" fill="#221408"/>
      <text x="0" y="-68" text-anchor="middle" font-size="28">${emoji}</text>
    </g>`;
}

function svgAmpStack(cx, cy, accent = '#ffd166') {
  return `
    <g transform="translate(${cx},${cy})">
      <ellipse cx="0" cy="6" rx="34" ry="8" fill="rgba(0,0,0,0.28)"/>
      <rect x="-32" y="-70" width="64" height="76" rx="4" fill="#241a14" stroke="#120c08" stroke-width="3"/>
      <rect x="-32" y="-6" width="64" height="10" fill="#120c08"/>
      <circle cx="0" cy="-32" r="22" fill="#141014" stroke="#000" stroke-width="2"/>
      <circle cx="0" cy="-32" r="15" fill="#2a2226"/>
      <rect x="-32" y="-108" width="64" height="42" rx="4" fill="#2c211a" stroke="#120c08" stroke-width="3"/>
      <circle cx="0" cy="-87" r="15" fill="#141014" stroke="#000" stroke-width="2"/>
      <circle cx="0" cy="-87" r="10" fill="#2a2226"/>
      <circle cx="-22" cy="-98" r="2.4" fill="${accent}" opacity="0.85"/>
    </g>`;
}

function svgPottedPlant(cx, cy, leaf = '#5a9a5a') {
  return `
    <g transform="translate(${cx},${cy})">
      <ellipse cx="0" cy="6" rx="26" ry="7" fill="rgba(0,0,0,0.25)"/>
      <path d="M-20,0 L20,0 L15,-32 L-15,-32 Z" fill="#8b6040" stroke="#5a4030" stroke-width="2"/>
      <ellipse cx="0" cy="-32" rx="16" ry="5" fill="#a07850"/>
      <path d="M0,-32 Q-6,-70 -30,-84" stroke="${leaf}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M0,-32 Q8,-76 34,-88" stroke="${leaf}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M0,-32 Q0,-82 0,-98" stroke="${leaf}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <ellipse cx="-30" cy="-86" rx="14" ry="9" fill="${leaf}"/>
      <ellipse cx="34" cy="-90" rx="15" ry="9" fill="${leaf}"/>
      <ellipse cx="0" cy="-100" rx="12" ry="9" fill="${leaf}"/>
    </g>`;
}

function svgFlagBanner(cx, cy, accent = '#e85a8a', label = '') {
  return `
    <g transform="translate(${cx},${cy})">
      <ellipse cx="0" cy="4" rx="10" ry="4" fill="rgba(0,0,0,0.22)"/>
      <rect x="-4" y="-120" width="8" height="124" fill="#5a4a3a"/>
      <path d="M4,-120 L70,-104 L4,-88 Z" fill="${accent}" stroke="#00000022" stroke-width="1"/>
      ${label ? `<text x="12" y="-100" font-family="Fredoka,sans-serif" font-size="13" font-weight="700" fill="#fff" opacity="0.9">${label}</text>` : ''}
      <circle cx="0" cy="-122" r="5" fill="${accent}"/>
    </g>`;
}

function svgLanternString(cx, cy, accent = '#ffb347') {
  return `
    <g transform="translate(${cx},${cy})">
      <ellipse cx="-46" cy="4" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
      <ellipse cx="46" cy="4" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
      <rect x="-48" y="-86" width="4" height="90" fill="#4a3020"/>
      <rect x="44" y="-86" width="4" height="90" fill="#4a3020"/>
      <path d="M-46,-86 Q0,-54 46,-86" stroke="#4a3020" stroke-width="2" fill="none"/>
      <g>
        <line x1="-28" y1="-78" x2="-28" y2="-66" stroke="#4a3020" stroke-width="2"/>
        <ellipse cx="-28" cy="-58" rx="11" ry="14" fill="${accent}" opacity="0.9"/>
        <ellipse cx="-28" cy="-58" rx="17" ry="19" fill="${accent}" opacity="0.2"/>
      </g>
      <g>
        <line x1="0" y1="-58" x2="0" y2="-46" stroke="#4a3020" stroke-width="2"/>
        <ellipse cx="0" cy="-36" rx="12" ry="15" fill="${accent}" opacity="0.95"/>
        <ellipse cx="0" cy="-36" rx="19" ry="21" fill="${accent}" opacity="0.22"/>
      </g>
      <g>
        <line x1="28" y1="-70" x2="28" y2="-58" stroke="#4a3020" stroke-width="2"/>
        <ellipse cx="28" cy="-50" rx="11" ry="14" fill="${accent}" opacity="0.9"/>
        <ellipse cx="28" cy="-50" rx="17" ry="19" fill="${accent}" opacity="0.2"/>
      </g>
    </g>`;
}

function svgCrateStack(cx, cy) {
  return `
    <g transform="translate(${cx},${cy})">
      <ellipse cx="0" cy="4" rx="34" ry="8" fill="rgba(0,0,0,0.25)"/>
      <rect x="-30" y="-30" width="60" height="34" fill="#8b6a45" stroke="#5a4025" stroke-width="2"/>
      <line x1="-30" y1="-13" x2="30" y2="-13" stroke="#5a4025" stroke-width="2"/>
      <line x1="-15" y1="-30" x2="-15" y2="4" stroke="#5a4025" stroke-width="2"/>
      <line x1="15" y1="-30" x2="15" y2="4" stroke="#5a4025" stroke-width="2"/>
      <rect x="-22" y="-58" width="44" height="28" fill="#9a7a50" stroke="#5a4025" stroke-width="2" transform="rotate(-4 0 -44)"/>
    </g>`;
}

function svgStarBanner(cx, cy, accent = '#d4a050') {
  const star = (r1, r2) => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? r1 : r2;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      pts.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(' ');
  };
  return `
    <g transform="translate(${cx},${cy})">
      <ellipse cx="0" cy="4" rx="10" ry="4" fill="rgba(0,0,0,0.2)"/>
      <rect x="-4" y="-100" width="8" height="104" fill="#4a3a2a"/>
      <polygon points="${star(30, 13)}" fill="${accent}" stroke="#00000030" stroke-width="2" transform="translate(0,-118)"/>
      <polygon points="${star(30, 13)}" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.4" transform="translate(0,-118)"/>
    </g>`;
}

function svgBarrelKeg(cx, cy) {
  return `
    <g transform="translate(${cx},${cy})">
      <ellipse cx="0" cy="6" rx="28" ry="8" fill="rgba(0,0,0,0.25)"/>
      <path d="M-24,0 Q-30,-30 -24,-58 Q0,-66 24,-58 Q30,-30 24,0 Q0,8 -24,0 Z" fill="#8b5a2b" stroke="#5a3818" stroke-width="3"/>
      <ellipse cx="0" cy="0" rx="24" ry="8" fill="#6a4020" opacity="0.4"/>
      <rect x="-30" y="-42" width="60" height="8" fill="#3a2818"/>
      <rect x="-28" y="-16" width="56" height="8" fill="#3a2818"/>
    </g>`;
}

function svgTrophyPedestal(cx, cy, accent = '#d4a050') {
  return `
    <g transform="translate(${cx},${cy})">
      <ellipse cx="0" cy="6" rx="24" ry="7" fill="rgba(0,0,0,0.25)"/>
      <rect x="-20" y="-24" width="40" height="30" fill="#5a4a70" stroke="#3a2a50" stroke-width="2"/>
      <rect x="-4" y="-40" width="8" height="18" fill="${accent}"/>
      <path d="M-14,-70 Q-14,-48 0,-42 Q14,-48 14,-70 L10,-70 Q10,-54 0,-50 Q-10,-54 -10,-70 Z" fill="${accent}" stroke="#8a6030" stroke-width="1.5"/>
      <path d="M-14,-68 Q-26,-68 -26,-56 Q-26,-48 -14,-48" fill="none" stroke="${accent}" stroke-width="3"/>
      <path d="M14,-68 Q26,-68 26,-56 Q26,-48 14,-48" fill="none" stroke="${accent}" stroke-width="3"/>
    </g>`;
}

function svgAnchorBuoy(cx, cy, accent = '#cc3333') {
  return `
    <g transform="translate(${cx},${cy})">
      <ellipse cx="0" cy="4" rx="16" ry="6" fill="rgba(0,0,0,0.22)"/>
      <rect x="-10" y="-56" width="20" height="16" rx="10" fill="${accent}" stroke="#8b2020" stroke-width="2"/>
      <rect x="-10" y="-40" width="20" height="16" rx="10" fill="#f5f0e8" stroke="#8b2020" stroke-width="2"/>
      <rect x="-10" y="-24" width="20" height="16" rx="10" fill="${accent}" stroke="#8b2020" stroke-width="2"/>
      <circle cx="0" cy="-64" r="7" fill="none" stroke="#3a3a3a" stroke-width="3"/>
    </g>`;
}

function svgDiscoBallProp(cx, groundY, accent = '#6bcbff') {
  const ballY = groundY - 60;
  return `
    <line x1="${cx}" y1="0" x2="${cx}" y2="${ballY - 24}" stroke="#3a3a3a" stroke-width="2"/>
    <circle cx="${cx}" cy="${ballY}" r="24" fill="#c8d0d8" stroke="#8a92a0" stroke-width="2"/>
    ${Array.from({ length: 4 }, (_, i) => `<line x1="${cx - 24}" y1="${ballY - 15 + i * 8}" x2="${cx + 24}" y2="${ballY - 15 + i * 8}" stroke="#8a92a0" stroke-width="1" opacity="0.5"/>`).join('')}
    ${Array.from({ length: 4 }, (_, i) => `<line x1="${cx - 18 + i * 12}" y1="${ballY - 24}" x2="${cx - 18 + i * 12}" y2="${ballY + 24}" stroke="#8a92a0" stroke-width="1" opacity="0.5"/>`).join('')}
    <circle cx="${cx - 8}" cy="${ballY - 8}" r="3" fill="${accent}" opacity="0.85"/>
    <circle cx="${cx + 9}" cy="${ballY + 6}" r="2.5" fill="#fff" opacity="0.9"/>
    <ellipse cx="${cx}" cy="${groundY + 4}" rx="18" ry="6" fill="rgba(0,0,0,0.18)"/>`;
}

function composeDecorLayer(leftFn, rightFn) {
  return `${leftFn(92, 374)}${svgGuitarCase(400, 384, 0.85)}${rightFn(708, 374)}`;
}

function pickGenericProp(name) {
  const n = (name || '').toLowerCase();
  if (/night ?club/.test(n)) return (cx, cy) => svgDiscoBallProp(cx, cy, '#ff6b9d');
  if (/crystal/.test(n)) return (cx, cy) => svgDiscoBallProp(cx, cy, '#9ac8e8');
  if (/river|amphitheat|harbor|pier/.test(n)) return (cx, cy) => svgAnchorBuoy(cx, cy);
  if (/campus|green|rooftop/.test(n)) return (cx, cy) => svgPottedPlant(cx, cy);
  if (/castle|stadium|fair|arena|fest|global/.test(n)) return (cx, cy) => svgFlagBanner(cx, cy, '#6bcbff');
  if (/cellar|market/.test(n)) return (cx, cy) => svgLanternString(cx, cy);
  if (/theater|playhouse/.test(n)) return (cx, cy) => svgStarBanner(cx, cy);
  if (/world|biggest/.test(n)) return (cx, cy) => svgTrophyPedestal(cx, cy);
  return (cx, cy) => svgAmpStack(cx, cy);
}

const VENUE_BACKDROPS = {
  'street-corner': () => backdropLayers('street-corner', [
    /* FAR — sky & distant skyline */
    `<defs>
      <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a90d9"/><stop offset="55%" stop-color="#8ec5f0"/><stop offset="100%" stop-color="#f0d090"/>
      </linearGradient>
      <radialGradient id="st-sun" cx="75%" cy="18%" r="22%">
        <stop offset="0%" stop-color="#fff8d0"/><stop offset="100%" stop-color="#f0d090" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="800" height="400" fill="url(#st-sky)"/>
    <rect width="800" height="400" fill="url(#st-sun)"/>
    <ellipse cx="120" cy="95" rx="70" ry="22" fill="#fff" opacity="0.35"/>
    <ellipse cx="280" cy="75" rx="90" ry="28" fill="#fff" opacity="0.28"/>
    <ellipse cx="620" cy="85" rx="80" ry="25" fill="#fff" opacity="0.3"/>
    <!-- distant buildings -->
    <rect x="0" y="175" width="800" height="90" fill="#6a7a8a" opacity="0.45"/>
    <rect x="30" y="155" width="55" height="115" fill="#5a6a78" opacity="0.5"/>
    <rect x="100" y="140" width="70" height="130" fill="#4a5a68" opacity="0.45"/>
    <rect x="200" y="160" width="50" height="110" fill="#5a6a78" opacity="0.4"/>
    <rect x="520" y="145" width="80" height="125" fill="#4a5a68" opacity="0.45"/>
    <rect x="640" y="150" width="90" height="120" fill="#5a6a78" opacity="0.5"/>
    <rect x="740" y="165" width="60" height="105" fill="#4a5a68" opacity="0.4"/>`,

    /* MID — main buildings */
    `<rect x="0" y="248" width="800" height="152" fill="#7a6a58" opacity="0.25"/>
    <rect x="20" y="110" width="100" height="175" fill="#5a6a7a" stroke="#2a3540" stroke-width="3"/>
    <rect x="30" y="130" width="22" height="28" fill="#ffe9a0" opacity="0.85"/>
    <rect x="62" y="140" width="22" height="28" fill="#ffe9a0" opacity="0.55"/>
    <rect x="30" y="175" width="22" height="28" fill="#ffe9a0" opacity="0.4"/>
    <rect x="130" y="75" width="125" height="210" fill="#4a5568" stroke="#2a3540" stroke-width="4"/>
    <rect x="148" y="98" width="28" height="34" fill="#ffe9a0" opacity="0.75"/>
    <rect x="188" y="108" width="28" height="34" fill="#ffe9a0" opacity="0.55"/>
    <rect x="148" y="148" width="28" height="34" fill="#ffe9a0" opacity="0.45"/>
    <rect x="560" y="88" width="115" height="197" fill="#6a5a7a" stroke="#2a3540" stroke-width="3"/>
    <rect x="580" y="110" width="24" height="30" fill="#ffe9a0" opacity="0.65"/>
    <rect x="620" y="120" width="24" height="30" fill="#ffe9a0" opacity="0.5"/>
    <rect x="680" y="115" width="95" height="170" fill="#5a6a8a" stroke="#2a3540" stroke-width="3"/>
    <rect x="700" y="135" width="20" height="26" fill="#ffe9a0" opacity="0.6"/>
    <!-- awning shadow -->
    <path d="M115,108 L255,108 L248,125 L122,125 Z" fill="#2a3540" opacity="0.35"/>`,

    /* NEAR — street & sidewalk */
    `<rect y="268" width="800" height="14" fill="#9a9080"/>
    <rect y="282" width="800" height="118" fill="#8b7355"/>
    <!-- perspective street lines -->
    <line x1="400" y1="282" x2="80" y2="400" stroke="#6b5a45" stroke-width="2" opacity="0.5"/>
    <line x1="400" y1="282" x2="200" y2="400" stroke="#6b5a45" stroke-width="2" opacity="0.35"/>
    <line x1="400" y1="282" x2="600" y2="400" stroke="#6b5a45" stroke-width="2" opacity="0.35"/>
    <line x1="400" y1="282" x2="720" y2="400" stroke="#6b5a45" stroke-width="2" opacity="0.5"/>
    <rect y="275" width="800" height="10" fill="#6b5a45"/>
    <ellipse cx="400" cy="318" rx="280" ry="18" fill="rgba(0,0,0,0.12)"/>
    <!-- curb -->
    <rect y="268" width="800" height="6" fill="#b0a898"/>
  `,

    /* FRONT — lamp, hydrant, stage shadow */
    `<rect x="388" y="168" width="12" height="118" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="2"/>
    <ellipse cx="394" cy="162" rx="22" ry="20" fill="#3a3a3a"/>
    <circle cx="394" cy="158" r="16" fill="#fff8d0" opacity="0.95"/>
    <ellipse cx="394" cy="158" rx="28" ry="24" fill="#fff8a0" opacity="0.2"/>
    <ellipse cx="394" cy="305" rx="48" ry="10" fill="rgba(0,0,0,0.28)"/>
    <!-- fire hydrant -->
    <rect x="155" y="318" width="18" height="28" rx="4" fill="#cc3333" stroke="#8b2020" stroke-width="2"/>
    <rect x="148" y="328" width="32" height="10" rx="3" fill="#cc3333" stroke="#8b2020" stroke-width="2"/>
    <!-- newspaper box -->
    <rect x="620" y="305" width="36" height="42" fill="#2a5080" stroke="#1a3050" stroke-width="2"/>
    <rect x="625" y="310" width="26" height="18" fill="#6bcbff" opacity="0.6"/>
    <ellipse cx="638" cy="352" rx="22" ry="6" fill="rgba(0,0,0,0.22)"/>
    <!-- foreground haze -->
    <rect y="340" width="800" height="60" fill="url(#st-fog)" opacity="0.15"/>
    <defs><linearGradient id="st-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5d89a" stop-opacity="0"/><stop offset="100%" stop-color="#f5d89a"/></linearGradient></defs>`,

    /* DECOR — guitar case out for tips, flanked by street set-dressing */
    composeDecorLayer(
      (cx, cy) => svgCrateStack(cx, cy),
      (cx, cy) => svgFlagBanner(cx, cy, '#ffe9a0', 'TIPS'),
    ),
  ]),

  'local-tavern': () => backdropLayers('local-tavern', [
    /* FAR — back wall depth */
    `<defs>
      <linearGradient id="tv-depth" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a0e08"/><stop offset="100%" stop-color="#2a1810"/>
      </linearGradient>
      <radialGradient id="tv-glow1" cx="25%" cy="30%" r="30%"><stop offset="0%" stop-color="#ffb347" stop-opacity="0.25"/><stop offset="100%" stop-opacity="0"/></radialGradient>
      <radialGradient id="tv-glow2" cx="75%" cy="25%" r="28%"><stop offset="0%" stop-color="#ff9f5a" stop-opacity="0.2"/><stop offset="100%" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="800" height="400" fill="url(#tv-depth)"/>
    <rect width="800" height="400" fill="url(#tv-glow1)"/>
    <rect width="800" height="400" fill="url(#tv-glow2)"/>
    <!-- recessed back wall -->
    <rect x="40" y="50" width="720" height="260" fill="#2a1810" stroke="#1a0e08" stroke-width="6"/>
    <rect x="55" y="65" width="690" height="230" fill="#3a2218" opacity="0.6"/>
    <!-- distant window -->
    <rect x="620" y="80" width="60" height="80" rx="4" fill="#1a2838" stroke="#3a2818" stroke-width="3"/>
    <rect x="628" y="88" width="44" height="64" fill="#4a6080" opacity="0.5"/>
    ${Array.from({ length: 10 }, (_, i) => `<rect x="${55 + i * 69}" y="65" width="3" height="230" fill="#1a0e08" opacity="0.35"/>`).join('')}`,

    /* MID — bar shelves & sign */
    `<rect x="60" y="55" width="680" height="300" fill="#4a3020"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 68}" y="55" width="5" height="300" fill="#3a2518" opacity="0.55"/>`).join('')}
  <!-- bar back shelf (recessed) -->
    <rect x="90" y="95" width="620" height="130" fill="#2a1810" stroke="#1a0e08" stroke-width="4"/>
    <rect x="105" y="108" width="590" height="8" fill="#5a4030"/>
    <rect x="110" y="118" width="48" height="72" rx="4" fill="#5a3828" stroke="#3a2518" stroke-width="2"/>
    <rect x="175" y="122" width="38" height="68" rx="4" fill="#6a4830" stroke="#3a2518" stroke-width="2"/>
    <rect x="235" y="120" width="42" height="70" rx="4" fill="#5a3828"/>
    <rect x="295" y="125" width="35" height="65" rx="4" fill="#7a5840"/>
    <rect x="480" y="118" width="48" height="72" rx="4" fill="#6a4830"/>
    <rect x="545" y="122" width="40" height="68" rx="4" fill="#5a3828"/>
    <rect x="610" y="120" width="45" height="70" rx="4" fill="#7a5840"/>
    <!-- hanging sign -->
    <rect x="310" y="28" width="180" height="55" rx="8" fill="#5c3018" stroke="#8b5a2b" stroke-width="4"/>
    <rect x="318" y="36" width="164" height="38" rx="6" fill="#6a4020"/>
    <text x="400" y="64" text-anchor="middle" fill="#f5e6c8" font-family="Fredoka,sans-serif" font-size="24" font-weight="700">TAVERN</text>
    <line x1="370" y1="28" x2="370" y2="18" stroke="#8b5a2b" stroke-width="3"/>
    <line x1="430" y1="28" x2="430" y2="18" stroke="#8b5a2b" stroke-width="3"/>
    <!-- pendant lights -->
    <line x1="150" y1="0" x2="150" y2="72" stroke="#3a2818" stroke-width="2"/>
    <ellipse cx="150" cy="78" rx="28" ry="18" fill="#ffb347" opacity="0.5"/>
    <line x1="400" y1="0" x2="400" y2="62" stroke="#3a2818" stroke-width="2"/>
    <ellipse cx="400" cy="68" rx="34" ry="20" fill="#ff9f5a" opacity="0.55"/>
    <line x1="650" y1="0" x2="650" y2="72" stroke="#3a2818" stroke-width="2"/>
    <ellipse cx="650" cy="78" rx="28" ry="18" fill="#ffb347" opacity="0.5"/>`,

    /* NEAR — bar counter & floor */
    `<rect y="310" width="800" height="90" fill="#3a2818"/>
    <!-- bar counter (3D top) -->
    <rect x="50" y="248" width="700" height="72" fill="#5a3828" stroke="#3a2518" stroke-width="3"/>
    <rect x="50" y="248" width="700" height="14" fill="#7a5840"/>
    <rect x="50" y="262" width="700" height="8" fill="#4a3020" opacity="0.5"/>
    <!-- counter front face -->
    <rect x="50" y="320" width="700" height="38" fill="#4a3020" stroke="#2a1810" stroke-width="2"/>
    <!-- floor boards -->
    ${Array.from({ length: 14 }, (_, i) => `<rect x="${i * 58}" y="358" width="56" height="42" fill="${i % 2 ? '#3a2818' : '#322218'}" stroke="#2a1810" stroke-width="1"/>`).join('')}
    <ellipse cx="400" cy="338" rx="220" ry="14" fill="rgba(0,0,0,0.2)"/>
    <!-- stools -->
    <ellipse cx="200" cy="318" rx="22" ry="8" fill="#2a1810"/>
    <rect x="193" y="290" width="14" height="28" fill="#3a3028"/>
    <ellipse cx="400" cy="318" rx="22" ry="8" fill="#2a1810"/>
    <rect x="393" y="290" width="14" height="28" fill="#3a3028"/>
    <ellipse cx="600" cy="318" rx="22" ry="8" fill="#2a1810"/>
    <rect x="593" y="290" width="14" height="28" fill="#3a3028"/>`,

    /* FRONT — table, mug, candle */
    `<rect x="0" y="355" width="800" height="45" fill="#2a1810" opacity="0.4"/>
    <!-- foreground table -->
    <ellipse cx="120" cy="365" rx="75" ry="18" fill="#4a3020" stroke="#2a1810" stroke-width="2"/>
    <ellipse cx="120" cy="358" rx="68" ry="14" fill="#6a4838"/>
    <rect x="108" y="365" width="24" height="32" fill="#3a2818"/>
    <!-- mug -->
    <rect x="95" y="340" width="22" height="26" rx="4" fill="#c8a050" stroke="#8b7030" stroke-width="2"/>
    <ellipse cx="106" cy="340" rx="11" ry="4" fill="#e8c070"/>
    <!-- candle -->
    <rect x="680" y="330" width="8" height="28" fill="#f5e6c8"/>
    <ellipse cx="684" cy="328" rx="6" ry="8" fill="#ffb347" opacity="0.9"/>
    <ellipse cx="684" cy="325" rx="12" ry="14" fill="#ff9f5a" opacity="0.25"/>
    <ellipse cx="684" cy="368" rx="40" ry="10" fill="rgba(0,0,0,0.25)"/>
    <!-- warm fog -->
    <rect y="370" width="800" height="30" fill="#ffb347" opacity="0.06"/>`,

    /* DECOR — guitar case out for tips, flanked by tavern set-dressing */
    composeDecorLayer(
      (cx, cy) => svgBarrelKeg(cx, cy),
      (cx, cy) => svgLanternString(cx, cy, '#ffb347'),
    ),
  ]),

  'town-square': () => backdropLayers('town-square', [
    /* FAR — sky & hills */
    `<defs>
      <linearGradient id="sq-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5aade8"/><stop offset="70%" stop-color="#a8d8f0"/><stop offset="100%" stop-color="#d8e8c8"/>
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#sq-sky)"/>
    <ellipse cx="650" cy="60" rx="55" ry="55" fill="#fff8d0" opacity="0.85"/>
    <ellipse cx="650" cy="60" rx="70" ry="70" fill="#fff8d0" opacity="0.15"/>
    <!-- distant hills -->
    <path d="M0,200 Q200,150 400,185 Q600,220 800,170 L800,260 L0,260 Z" fill="#7a9a6a" opacity="0.55"/>
    <path d="M0,220 Q250,175 500,210 Q650,235 800,200 L800,270 L0,270 Z" fill="#6a8a5a" opacity="0.65"/>
    <!-- tiny distant buildings -->
    <rect x="80" y="195" width="40" height="55" fill="#a0a0a0" opacity="0.5"/>
    <rect x="140" y="188" width="35" height="62" fill="#909090" opacity="0.45"/>
    <rect x="680" y="192" width="45" height="58" fill="#a0a0a0" opacity="0.5"/>
    <rect x="730" y="198" width="38" height="52" fill="#909090" opacity="0.45"/>`,

    /* MID — clock tower & trees */
    `<rect x="330" y="45" width="140" height="245" fill="#b8a890" stroke="#8a7a68" stroke-width="5"/>
    <rect x="342" y="55" width="116" height="230" fill="#c8b8a0"/>
    <polygon points="400,18 445,52 355,52" fill="#8a5040" stroke="#6a3828" stroke-width="3"/>
    <rect x="385" y="28" width="30" height="24" fill="#6a3828"/>
    <circle cx="400" cy="125" r="42" fill="#f5f0e8" stroke="#8a7a68" stroke-width="4"/>
    <circle cx="400" cy="125" r="34" fill="#fff" stroke="#ccc" stroke-width="2"/>
    <line x1="400" y1="125" x2="400" y2="95" stroke="#333" stroke-width="4" stroke-linecap="round"/>
    <line x1="400" y1="125" x2="425" y2="132" stroke="#333" stroke-width="3" stroke-linecap="round"/>
    <!-- tower shadow side -->
    <rect x="330" y="45" width="18" height="245" fill="#8a7a68" opacity="0.35"/>
    <!-- left tree -->
    <rect x="62" y="248" width="20" height="55" fill="#6b4423"/>
    <ellipse cx="72" cy="235" rx="48" ry="58" fill="#4a8a4a"/>
    <ellipse cx="58" cy="220" rx="32" ry="40" fill="#5a9a5a"/>
  <!-- right tree -->
    <rect x="718" y="242" width="22" height="60" fill="#6b4423"/>
    <ellipse cx="729" cy="228" rx="52" ry="62" fill="#4a8a4a"/>
    <ellipse cx="745" cy="212" rx="35" ry="42" fill="#5a9a5a"/>
    <!-- shop fronts -->
    <rect x="180" y="210" width="90" height="80" fill="#c8b0a0" stroke="#8a7a68" stroke-width="3"/>
    <rect x="195" y="230" width="25" height="35" fill="#6a8090" opacity="0.6"/>
    <rect x="530" y="205" width="100" height="85" fill="#b8a090" stroke="#8a7a68" stroke-width="3"/>
    <rect x="548" y="225" width="28" height="38" fill="#6a8090" opacity="0.6"/>`,

    /* NEAR — fountain & plaza */
    `<rect y="268" width="800" height="132" fill="#8aab7a"/>
    <!-- cobble perspective -->
    ${Array.from({ length: 8 }, (_, row) =>
      Array.from({ length: 10 }, (_, col) => {
        const x = 60 + col * 72 + (row % 2) * 36;
        const y = 290 + row * 14;
        const w = 32 + row * 2;
        return `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="7" fill="${row % 2 ? '#7a9a6a' : '#6a8a5a'}" opacity="0.55"/>`;
      }).join('')
    ).join('')}
    <!-- fountain basin -->
    <ellipse cx="200" cy="310" rx="68" ry="24" fill="#5a8aa8" stroke="#4a7a98" stroke-width="3"/>
    <ellipse cx="200" cy="298" rx="48" ry="16" fill="#7ab0d0"/>
    <ellipse cx="200" cy="292" rx="30" ry="10" fill="#9ac8e8" opacity="0.7"/>
    <rect x="188" y="248" width="24" height="58" fill="#b0b0b0" stroke="#888" stroke-width="2"/>
    <ellipse cx="200" cy="248" rx="12" ry="8" fill="#a0a0a0"/>
    <!-- water spray -->
    <path d="M200,240 Q185,220 200,210 Q215,220 200,240" fill="#9ac8e8" opacity="0.5"/>
    <ellipse cx="200" cy="328" rx="75" ry="12" fill="rgba(0,0,0,0.15)"/>`,

    /* FRONT — bench, lamppost, planter */
    `<rect x="520" y="288" width="80" height="10" rx="3" fill="#6b4423" stroke="#4a3018" stroke-width="2"/>
    <rect x="532" y="298" width="8" height="28" fill="#5a3818"/>
    <rect x="580" y="298" width="8" height="28" fill="#5a3818"/>
    <ellipse cx="560" cy="330" rx="50" ry="10" fill="rgba(0,0,0,0.2)"/>
    <!-- lamppost -->
    <rect x="480" y="255" width="8" height="75" fill="#4a4a4a"/>
    <path d="M460,255 L508,255 L484,240 Z" fill="#3a3a3a"/>
    <ellipse cx="484" cy="252" rx="14" ry="10" fill="#fff8d0" opacity="0.9"/>
    <!-- flower planter -->
    <rect x="300" y="318" width="50" height="28" rx="4" fill="#8b6040" stroke="#5a4030" stroke-width="2"/>
    <ellipse cx="325" cy="312" rx="28" ry="16" fill="#e85a8a" opacity="0.8"/>
    <ellipse cx="312" cy="308" rx="14" ry="12" fill="#ff8ab0"/>
    <ellipse cx="338" cy="306" rx="12" ry="10" fill="#ffd166"/>
    <rect y="355" width="800" height="45" fill="#8aab7a" opacity="0.35"/>`,

    /* DECOR — guitar case out for tips, flanked by town-square set-dressing */
    composeDecorLayer(
      (cx, cy) => svgPottedPlant(cx, cy, '#5a9a5a'),
      (cx, cy) => svgFlagBanner(cx, cy, '#e85a8a'),
    ),
  ]),

  'talent-show': () => backdropLayers('talent-show', [
    /* FAR — auditorium depth */
    `<defs>
      <radialGradient id="ts-spot" cx="50%" cy="30%" r="55%">
        <stop offset="0%" stop-color="#3a1858"/><stop offset="100%" stop-color="#0a0518"/>
      </radialGradient>
    </defs>
    <rect width="800" height="400" fill="url(#ts-spot)"/>
    <!-- star dots -->
    ${Array.from({ length: 40 }, (_, i) => {
      const x = (i * 97 + 23) % 800;
      const y = (i * 53 + 11) % 180;
      return `<circle cx="${x}" cy="${y}" r="${1 + (i % 2)}" fill="#fff" opacity="${0.15 + (i % 5) * 0.08}"/>`;
    }).join('')}
    <!-- back wall recede -->
    <path d="M100,80 L700,80 L680,280 L120,280 Z" fill="#1a0828" opacity="0.7"/>
    <path d="M150,100 L650,100 L635,260 L165,260 Z" fill="#2a1040" opacity="0.5"/>`,

    /* MID — curtains & arch */
    `<path d="M0,0 Q120,220 0,400 L0,400 L0,0" fill="#6b1030"/>
    <path d="M0,0 Q80,200 0,400" fill="#8b1538" opacity="0.85"/>
    <path d="M800,0 Q680,220 800,400 L800,400 L800,0" fill="#6b1030"/>
    <path d="M800,0 Q720,200 800,400" fill="#8b1538" opacity="0.85"/>
    <path d="M0,0 Q200,190 0,400" fill="#a02050" opacity="0.45"/>
    <path d="M800,0 Q600,190 800,400" fill="#a02050" opacity="0.45"/>
    <!-- curtain folds -->
    ${Array.from({ length: 6 }, (_, i) => `<path d="M${i * 28},0 Q${i * 28 + 14},200 ${i * 28},400" fill="none" stroke="#5a0828" stroke-width="2" opacity="0.4"/>`).join('')}
    ${Array.from({ length: 6 }, (_, i) => `<path d="M${800 - i * 28},0 Q${800 - i * 28 - 14},200 ${800 - i * 28},400" fill="none" stroke="#5a0828" stroke-width="2" opacity="0.4"/>`).join('')}
    <!-- proscenium arch -->
    <ellipse cx="400" cy="430" rx="340" ry="210" fill="#2a1040" stroke="#d4a050" stroke-width="8"/>
    <ellipse cx="400" cy="430" rx="300" ry="185" fill="none" stroke="#8a6030" stroke-width="3" opacity="0.6"/>
    <!-- spotlights -->
    <polygon points="180,0 230,0 340,290 290,290" fill="rgba(255,220,100,0.1)"/>
    <polygon points="380,0 430,0 450,310 400,310" fill="rgba(255,220,100,0.16)"/>
    <polygon points="580,0 630,0 540,290 490,290" fill="rgba(255,220,100,0.1)"/>
    <text x="400" y="298" text-anchor="middle" fill="#d4a050" font-family="Fredoka,sans-serif" font-size="16" font-weight="700" opacity="0.9">★ TALENT SHOW ★</text>`,

    /* NEAR — stage floor */
    `<rect y="300" width="800" height="100" fill="#2a1040"/>
    <!-- stage planks -->
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 68}" y="310" width="64" height="80" fill="${i % 2 ? '#3a1850' : '#321440'}" stroke="#1a0828" stroke-width="1"/>`).join('')}
    <rect y="305" width="800" height="8" fill="#d4a050" opacity="0.5"/>
    <!-- judges table -->
    <rect x="230" y="318" width="340" height="18" fill="#4a3060" stroke="#2a1840" stroke-width="2"/>
    <rect x="230" y="336" width="12" height="42" fill="#3a2048"/>
    <rect x="558" y="336" width="12" height="42" fill="#3a2048"/>
    <ellipse cx="400" cy="382" rx="180" ry="12" fill="rgba(0,0,0,0.25)"/>`,

    /* FRONT — mic stand, monitor */
    `<rect x="385" y="268" width="6" height="55" fill="#555"/>
    <ellipse cx="388" cy="262" rx="12" ry="16" fill="#888" stroke="#444" stroke-width="2"/>
    <rect x="120" y="340" width="45" height="32" rx="3" fill="#222" stroke="#111" stroke-width="2"/>
    <rect x="125" y="345" width="35" height="22" fill="#333"/>
    <rect x="635" y="340" width="45" height="32" rx="3" fill="#222" stroke="#111" stroke-width="2"/>
    <ellipse cx="400" cy="395" rx="300" ry="20" fill="rgba(0,0,0,0.2)"/>
    <rect y="370" width="800" height="30" fill="#1a0a2e" opacity="0.35"/>`,

    /* DECOR — guitar case out for tips, flanked by showbiz set-dressing */
    composeDecorLayer(
      (cx, cy) => svgTrophyPedestal(cx, cy, '#d4a050'),
      (cx, cy) => svgStarBanner(cx, cy, '#d4a050'),
    ),
  ]),

  'small-concert-venue': () => backdropLayers('small-concert-venue', [
    /* FAR — arena & fog */
    `<defs>
      <linearGradient id="cv-back" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a0618"/><stop offset="100%" stop-color="#1a1030"/>
      </linearGradient>
      <radialGradient id="cv-fog" cx="50%" cy="80%" r="60%">
        <stop offset="0%" stop-color="#6a40a0" stop-opacity="0.2"/><stop offset="100%" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="800" height="400" fill="url(#cv-back)"/>
    <rect width="800" height="400" fill="url(#cv-fog)"/>
    <!-- arena bowl -->
    <path d="M0,120 Q400,60 800,120 L800,320 Q400,380 0,320 Z" fill="#120820" opacity="0.8"/>
    <path d="M50,140 Q400,90 750,140 L730,300 Q400,350 70,300 Z" fill="#1a1030" opacity="0.6"/>
    <!-- distant crowd dots -->
    ${Array.from({ length: 30 }, (_, i) => {
      const x = 80 + (i % 15) * 48;
      const y = 155 + Math.floor(i / 15) * 22;
      return `<circle cx="${x}" cy="${y}" r="3" fill="#3a2860" opacity="0.6"/>`;
    }).join('')}`,

    /* MID — truss, lights, neon */
    `<rect x="80" y="22" width="640" height="14" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="2"/>
    <rect x="100" y="36" width="10" height="88" fill="#333"/>
    <rect x="690" y="36" width="10" height="88" fill="#333"/>
    ${[160, 260, 400, 540, 640].map((x, i) => {
      const colors = ['#ff6b9d', '#6bcbff', '#ffd166', '#6bcbff', '#ff6b9d'];
      return `
        <line x1="${x}" y1="36" x2="${x}" y2="52" stroke="#444" stroke-width="2"/>
        <circle cx="${x}" cy="58" r="14" fill="${colors[i]}" opacity="0.95"/>
        <polygon points="${x},72 ${x - 22},210 ${x + 22},210" fill="rgba(255,255,255,0.05)"/>
        <polygon points="${x},72 ${x - 18},200 ${x + 18},200" fill="${colors[i]}" opacity="0.06"/>`;
    }).join('')}
    <text x="400" y="125" text-anchor="middle" fill="#ff6b9d" font-family="Fredoka,sans-serif" font-size="42" font-weight="700" opacity="0.9">LIVE</text>
    <text x="402" y="127" text-anchor="middle" fill="#ff6b9d" font-family="Fredoka,sans-serif" font-size="42" font-weight="700" opacity="0.25">LIVE</text>`,

    /* NEAR — crowd silhouettes */
    `${Array.from({ length: 18 }, (_, i) => {
      const x = 45 + i * 42;
      const h = 22 + (i % 4) * 6;
      return `<ellipse cx="${x}" cy="${318 - h / 2}" rx="14" ry="${h / 2}" fill="#1a1030"/>
        <ellipse cx="${x}" cy="${318 - h - 8}" rx="11" ry="12" fill="#2a1848"/>`;
    }).join('')}
    <rect y="328" width="800" height="72" fill="#1a1035"/>
    <rect y="322" width="800" height="8" fill="#ffd166" opacity="0.55"/>
    <rect y="320" width="800" height="3" fill="#fff" opacity="0.2"/>`,

    /* FRONT — stage monitors & edge */
    `<rect x="60" y="335" width="55" height="38" rx="4" fill="#111" stroke="#333" stroke-width="2" transform="rotate(-8 87 354)"/>
    <rect x="685" y="335" width="55" height="38" rx="4" fill="#111" stroke="#333" stroke-width="2" transform="rotate(8 712 354)"/>
    <rect y="355" width="800" height="45" fill="#0a0814" opacity="0.5"/>
    <!-- stage lip highlight -->
    <rect y="350" width="800" height="4" fill="#ffd166" opacity="0.35"/>
    <ellipse cx="400" cy="378" rx="350" ry="16" fill="rgba(0,0,0,0.3)"/>
    <!-- fog wisps -->
  <ellipse cx="150" cy="370" rx="100" ry="25" fill="#6a40a0" opacity="0.12"/>
    <ellipse cx="600" cy="375" rx="120" ry="28" fill="#4060a0" opacity="0.1"/>`,

    /* DECOR — guitar case out for tips, flanked by concert set-dressing */
    composeDecorLayer(
      (cx, cy) => svgAmpStack(cx, cy, '#ff6b9d'),
      (cx, cy) => svgDiscoBallProp(cx, cy, '#6bcbff'),
    ),
  ]),
};

VENUE_BACKDROPS['concert-venue'] = VENUE_BACKDROPS['small-concert-venue'];

function tierPalette(tier) {
  const themes = [
    { sky1: '#4a90d9', sky2: '#f0d090', ground: '#8b7355', accent: '#ffe9a0' },
    { sky1: '#1a0e08', sky2: '#4a3020', ground: '#3a2818', accent: '#ffb347' },
    { sky1: '#5aade8', sky2: '#d8e8c8', ground: '#8aab7a', accent: '#fff8d0' },
    { sky1: '#1a0a2e', sky2: '#3a1858', ground: '#2a1040', accent: '#d4a050' },
    { sky1: '#0a0618', sky2: '#1a1030', ground: '#1a1035', accent: '#ff6b9d' },
    { sky1: '#0a0820', sky2: '#2a1050', ground: '#1a0830', accent: '#ff6b9d' },
    { sky1: '#1a3050', sky2: '#4a80a8', ground: '#3a6048', accent: '#6bcbff' },
    { sky1: '#2a4828', sky2: '#8aba70', ground: '#5a8a48', accent: '#ffd166' },
  ];
  return themes[tier % themes.length];
}

function generateTierBackdrop(venue) {
  const t = venue.tier ?? 5;
  const p = tierPalette(t);
  const scale = 1 + t * 0.02;
  const lights = Math.min(12, 3 + Math.floor(t / 2));
  const crowdRows = Math.min(28, 4 + Math.floor(t * 0.8));
  const buildings = Math.min(10, 3 + Math.floor(t / 3));
  const isEpic = t >= 22;
  const uid = venue.id.replace(/[^a-z]/g, '');

  const far = `
    <defs>
      <linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${p.sky1}"/><stop offset="100%" stop-color="${p.sky2}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#sky-${uid})"/>
    ${isEpic ? `<ellipse cx="400" cy="120" rx="280" ry="100" fill="#6a40a0" opacity="0.15"/>` : ''}
    ${Array.from({ length: buildings }, (_, i) => {
      const x = 30 + i * (740 / buildings);
      const h = 80 + (i % 4) * 35 + t * 2;
      const w = 50 + (i % 3) * 20;
      return `<rect x="${x}" y="${260 - h}" width="${w}" height="${h}" fill="${p.ground}" opacity="${0.35 + (i % 3) * 0.1}" stroke="#1a1020" stroke-width="2"/>`;
    }).join('')}
    <path d="M0,${200 - t} Q400,${140 - t * 2} 800,${200 - t} L800,280 L0,280 Z" fill="${p.ground}" opacity="0.45"/>`;

  const mid = `
    <rect y="220" width="800" height="100" fill="${p.ground}" opacity="0.35"/>
    ${Array.from({ length: lights }, (_, i) => {
      const x = 60 + i * (680 / lights);
      const col = ['#ff6b9d', '#6bcbff', '#ffd166'][i % 3];
      return `
        <line x1="${x}" y1="20" x2="${x}" y2="50" stroke="#444" stroke-width="2"/>
        <circle cx="${x}" cy="58" r="${10 + (t % 4)}" fill="${col}" opacity="0.9"/>
        <polygon points="${x},70 ${x - 20},${200 + t} ${x + 20},${200 + t}" fill="${col}" opacity="0.07"/>`;
    }).join('')}
    ${t >= 10 ? `<text x="400" y="${110 + t % 20}" text-anchor="middle" fill="${p.accent}" font-family="Fredoka,sans-serif" font-size="${24 + Math.min(t, 20)}" font-weight="700" opacity="0.85">${venue.emoji}</text>` : ''}
    <rect x="120" y="${160 - t * 0.5}" width="560" height="${80 + t}" rx="8" fill="${p.ground}" opacity="0.5" stroke="${p.accent}" stroke-width="3"/>`;

  const near = `
    <rect y="280" width="800" height="120" fill="${p.ground}"/>
    ${Array.from({ length: crowdRows }, (_, i) => {
      const x = 25 + i * (750 / crowdRows);
      const h = 16 + (i % 5) * 4;
      return `<ellipse cx="${x}" cy="${310 - h}" rx="12" ry="${h / 2}" fill="#1a1030" opacity="0.85"/>
        <ellipse cx="${x}" cy="${310 - h - 10}" rx="9" ry="10" fill="#2a1848" opacity="0.9"/>`;
    }).join('')}
    <rect y="275" width="800" height="8" fill="${p.accent}" opacity="0.45"/>
    <ellipse cx="400" cy="320" rx="${200 + t * 8}" ry="18" fill="rgba(0,0,0,0.18)"/>`;

  const front = `
    ${isEpic ? `
      <rect x="50" y="300" width="700" height="60" rx="6" fill="#1a1035" stroke="${p.accent}" stroke-width="4" opacity="0.7"/>
      <text x="400" y="338" text-anchor="middle" fill="${p.accent}" font-family="Fredoka,sans-serif" font-size="22" font-weight="700">${venue.name}</text>
    ` : `
      <rect x="80" y="330" width="50" height="35" rx="4" fill="#111" stroke="#333" stroke-width="2"/>
      <rect x="670" y="330" width="50" height="35" rx="4" fill="#111" stroke="#333" stroke-width="2"/>
    `}
    <ellipse cx="200" cy="370" rx="90" ry="22" fill="${p.accent}" opacity="0.08"/>
    <ellipse cx="600" cy="375" rx="110" ry="25" fill="${p.accent}" opacity="0.06"/>
    <rect y="360" width="800" height="40" fill="#000" opacity="${0.12 + t * 0.008}"/>`;

  // DECOR — guitar case out for tips; one side is always a medallion of the
  // venue's own emoji (guaranteed on-brand for any name), the other is a
  // prop matched by keyword against the venue name.
  const decor = composeDecorLayer(
    (cx, cy) => svgEmojiMedallion(cx, cy, venue.emoji, p.accent),
    pickGenericProp(venue.name),
  );

  return backdropLayers(venue.id, [far, mid, near, front, decor]);
}

function renderStageLighting(tier = 0) {
  const t = tier ?? 0;
  const spots = Math.min(1 + Math.floor(t / 3), 8);
  const lasers = t >= 4 ? Math.min(2 + Math.floor((t - 4) / 2), 10) : 0;
  const beams = t >= 6 ? Math.min(1 + Math.floor((t - 6) / 4), 4) : 0;
  const strobes = t >= 10 ? Math.min(1 + Math.floor((t - 10) / 5), 5) : 0;
  const washes = t >= 3 ? Math.min(2 + Math.floor((t - 3) / 6), 3) : 0;

  const spotColors = ['#ffd166', '#6bcbff', '#ff6b9d', '#95e06c', '#c77dff', '#00ffcc', '#ff44aa', '#aaff00'];

  const spotHtml = Array.from({ length: spots }, (_, i) => {
    const x = 8 + (i / Math.max(spots - 1, 1)) * 84;
    const delay = i * 0.7;
    const color = spotColors[i % spotColors.length];
    return `<div class="stage-spotlight" style="left:${x}%;--spot-color:${color};--spot-delay:${delay}s"></div>`;
  }).join('');

  const laserColors = ['#ff0044', '#00ffcc', '#cc44ff', '#44ff66', '#ffaa00', '#ff66cc', '#66ccff', '#ff3300', '#00ff88', '#cc00ff'];

  const laserHtml = Array.from({ length: lasers }, (_, i) => {
    const x = 10 + i * (80 / Math.max(lasers, 1));
    const color = laserColors[i % laserColors.length];
    return `<div class="stage-laser" style="left:${x}%;--laser-color:${color};--laser-delay:${i * 0.35}s"></div>`;
  }).join('');

  const beamColors = ['#00ffcc', '#ff0044', '#cc44ff', '#ffaa00'];
  const beamHtml = Array.from({ length: beams }, (_, i) => {
    const y = 18 + i * 14;
    const color = beamColors[i % beamColors.length];
    return `<div class="stage-laser-beam" style="top:${y}%;--beam-color:${color};--beam-delay:${i * 0.55}s"></div>`;
  }).join('');

  const strobeColors = ['rgba(107,203,255,0.35)', 'rgba(255,107,157,0.32)', 'rgba(0,255,204,0.28)', 'rgba(255,209,102,0.3)', 'rgba(199,125,255,0.3)'];
  const strobeHtml = Array.from({ length: strobes }, (_, i) =>
    `<div class="stage-strobe" style="left:${15 + i * 16}%;--strobe-color:${strobeColors[i % strobeColors.length]};--strobe-delay:${i * 0.2}s"></div>`
  ).join('');

  const washColors = ['rgba(107,203,119,0.12)', 'rgba(255,107,157,0.1)', 'rgba(107,203,255,0.09)'];
  const washHtml = Array.from({ length: washes }, (_, i) =>
    `<div class="stage-wash" style="background:${washColors[i % washColors.length]};--wash-delay:${i * 0.5}s"></div>`
  ).join('');

  const fans = t >= 8
    ? `<div class="stage-beam-fan left" style="--fan-color:rgba(107,203,255,0.3)"></div><div class="stage-beam-fan right" style="--fan-color:rgba(255,107,157,0.28)"></div>`
    : '';

  const grid = t >= 14
    ? `<div class="stage-laser-grid" style="--grid-color:rgba(0,255,204,0.1)"></div>`
    : '';

  return `<div class="stage-lighting-rig" data-tier="${t}" aria-hidden="true">
    ${washHtml}${grid}${fans}${beamHtml}${laserHtml}${spotHtml}${strobeHtml}
    <div class="stage-light-haze"></div>
  </div>`;
}

function renderVenueBackdrop(venueId) {
  const id = venueId === 'concert-venue' ? 'small-concert-venue' : venueId;
  const fn = VENUE_BACKDROPS[id];
  if (fn) return fn();
  const venue = typeof VENUES !== 'undefined' ? VENUES.find((v) => v.id === id) : null;
  if (venue && !venue.handcrafted) return generateTierBackdrop(venue);
  return (VENUE_BACKDROPS['street-corner'] || generateTierBackdrop({ id: 'street-corner', tier: 0 }))();
}

if (typeof VENUES !== 'undefined') {
  VENUES.forEach((v) => {
    if (!v.handcrafted && !VENUE_BACKDROPS[v.id]) {
      VENUE_BACKDROPS[v.id] = () => generateTierBackdrop(v);
    }
  });
}

function initVenueParallax(root = document) {
  const backdrop = root.querySelector?.('.venue-backdrop') || (root.classList?.contains('venue-backdrop') ? root : null);
  if (!backdrop) return () => {};

  const layers = backdrop.querySelectorAll('.backdrop-layer');
  if (!layers.length) return () => {};

  // Stronger separation between planes so the parallax reads as real depth.
  const depth = [0.18, 0.45, 0.8, 1.15, 1.45];
  let raf = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let active = true;

  const apply = () => {
    if (!active) return;
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    layers.forEach((layer, i) => {
      const d = (depth[i] ?? 1) * 14;
      layer.style.setProperty('--px', `${currentX * d}px`);
      layer.style.setProperty('--py', `${currentY * d * 0.45}px`);
    });
    raf = requestAnimationFrame(apply);
  };

  const onMove = (e) => {
    const rect = moveTarget.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    targetX = (clientX - rect.left) / rect.width - 0.5;
    targetY = (clientY - rect.top) / rect.height - 0.5;
  };

  const onLeave = () => {
    targetX = 0;
    targetY = 0;
  };

  const moveTarget = backdrop.closest('.perform-screen, .hub-venue-preview') || backdrop;

  moveTarget.addEventListener('mousemove', onMove);
  moveTarget.addEventListener('mouseleave', onLeave);
  moveTarget.addEventListener('touchmove', onMove, { passive: true });
  moveTarget.addEventListener('touchend', onLeave);

  raf = requestAnimationFrame(apply);

  return () => {
    active = false;
    moveTarget.removeEventListener('mousemove', onMove);
    moveTarget.removeEventListener('mouseleave', onLeave);
    moveTarget.removeEventListener('touchmove', onMove);
    moveTarget.removeEventListener('touchend', onLeave);
    if (raf) cancelAnimationFrame(raf);
  };
}
