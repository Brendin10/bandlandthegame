const BANDMATES = {
  riff: {
    id: 'riff',
    name: 'Riff',
    role: 'Lead',
    fur: '#FF8C42',
    furLight: '#FFB07A',
    belly: '#FFD4B0',
    accent: '#2D5A27',
    hold: 'guitar',
    instrumentId: 'electric-guitar',
  },
  boom: {
    id: 'boom',
    name: 'Boom',
    role: 'Drums',
    fur: '#3ECFCC',
    furLight: '#7EEDE8',
    belly: '#B8F5F3',
    accent: '#1A6B68',
    hold: 'drums',
    instrumentId: 'drums',
  },
  melody: {
    id: 'melody',
    name: 'Melody',
    role: 'Keys',
    fur: '#6B8CFF',
    furLight: '#A4B8FF',
    belly: '#D0DAFF',
    accent: '#2A4080',
    hold: 'keys',
    instrumentId: 'keys',
  },
  slap: {
    id: 'slap',
    name: 'Slap',
    role: 'Bass',
    fur: '#7BC950',
    furLight: '#A8E080',
    belly: '#D4F0C0',
    accent: '#2A6020',
    hold: 'bass',
    instrumentId: 'bass',
  },
};

/* Draws a bandmate critter from its BANDMATES palette. This function was
 * referenced by game.js (renderBandmateCharacter) since the initial commit
 * but never actually existed - the moment a player recruited a bandmate,
 * every screen that drew the band crashed mid-render, which is why the
 * Green Room went completely unresponsive. */
function renderBandmate(id, size = 80) {
  const m = BANDMATES[id] || BANDMATES.riff;
  const h = Math.round((size * 140) / 120);
  const inst = { guitar: '🎸', drums: '🥁', keys: '🎹', bass: '🎸' }[m.hold] || '🎵';
  const O = typeof OUTLINE !== 'undefined' ? OUTLINE : '#1C1230';
  return `
    <svg viewBox="0 0 120 140" width="${size}" height="${h}" class="bandmate-svg" aria-hidden="true">
      <ellipse cx="60" cy="130" rx="34" ry="7" fill="rgba(0,0,0,0.25)"/>
      <circle cx="34" cy="26" r="13" fill="${m.fur}" stroke="${O}" stroke-width="3"/>
      <circle cx="86" cy="26" r="13" fill="${m.fur}" stroke="${O}" stroke-width="3"/>
      <circle cx="34" cy="27" r="6.5" fill="${m.furLight}"/>
      <circle cx="86" cy="27" r="6.5" fill="${m.furLight}"/>
      <ellipse cx="60" cy="78" rx="40" ry="48" fill="${m.fur}" stroke="${O}" stroke-width="3"/>
      <ellipse cx="60" cy="96" rx="25" ry="27" fill="${m.belly}"/>
      <path d="M34 40 Q60 28 86 40" fill="none" stroke="${m.furLight}" stroke-width="5" opacity="0.6" stroke-linecap="round"/>
      <rect x="36" y="42" width="48" height="8" rx="4" fill="${m.accent}" stroke="${O}" stroke-width="2"/>
      <ellipse cx="47" cy="62" rx="6.5" ry="7.5" fill="#fff" stroke="${O}" stroke-width="2"/>
      <ellipse cx="73" cy="62" rx="6.5" ry="7.5" fill="#fff" stroke="${O}" stroke-width="2"/>
      <circle cx="48.5" cy="63.5" r="3" fill="#2D1B69"/>
      <circle cx="74.5" cy="63.5" r="3" fill="#2D1B69"/>
      <circle cx="49.5" cy="62" r="1" fill="#fff"/>
      <circle cx="75.5" cy="62" r="1" fill="#fff"/>
      <ellipse cx="60" cy="72" rx="4.5" ry="3.2" fill="${m.accent}" stroke="${O}" stroke-width="1.5"/>
      <path d="M52 79 Q60 85 68 79" fill="none" stroke="${O}" stroke-width="2.5" stroke-linecap="round"/>
      <ellipse cx="22" cy="90" rx="9" ry="13" fill="${m.fur}" stroke="${O}" stroke-width="2.5" transform="rotate(18 22 90)"/>
      <ellipse cx="98" cy="90" rx="9" ry="13" fill="${m.fur}" stroke="${O}" stroke-width="2.5" transform="rotate(-18 98 90)"/>
      <ellipse cx="42" cy="126" rx="11" ry="7" fill="${m.accent}" stroke="${O}" stroke-width="2.5"/>
      <ellipse cx="78" cy="126" rx="11" ry="7" fill="${m.accent}" stroke="${O}" stroke-width="2.5"/>
      <text x="60" y="106" text-anchor="middle" font-size="24">${inst}</text>
    </svg>`;
}
