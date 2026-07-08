/* DOM-level flow test: boots the real game in jsdom (no browser needed) and
 * clicks through title -> hub -> Green Room -> every customization control ->
 * home -> shop -> purchase -> back. Catches render crashes and dead controls.
 * Run: npm i jsdom && node scripts/test-dom-flow.mjs */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(`${GAME}/index.html`, 'utf8').replace(/<script[^>]*src=[^>]*><\/script>/g, '');

const dom = new JSDOM(html, { url: 'http://localhost/?test=1', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window } = dom;
const errors = [];
window.addEventListener('error', (e) => errors.push('window.onerror: ' + e.message));
window.confirm = () => true;
window.SONG_ASSET_VERSION = '1';
window.eval(`
  window.AudioEngine = new Proxy({}, {
    get: (t, prop) => {
      if (prop === 'getMasterVolume') return () => 1;
      return () => ({ then: () => {}, catch: () => {} });
    },
  });
  var AudioEngine = window.AudioEngine;
`);

const files = [
  'js/instrument-grips.js', 'js/instrument-art.js', 'js/instruments.js',
  'js/song-manifest.js', 'js/songs.js', 'js/song-loader.js', 'js/stem-player.js',
  'js/data.js', 'js/character-rig.js', 'js/characters.js', 'js/wearables.js',
  'js/bandmates.js', 'js/metronome.js', 'js/rhythm-lane.js', 'js/bandaudio.js',
  'js/venues.js', 'js/save.js', 'js/game.js',
];
let bundle = files.map((f) => fs.readFileSync(`${GAME}/${f}`, 'utf8')).join('\n;\n');
bundle = bundle.replace("document.addEventListener('DOMContentLoaded', () => Game.init());", '');
bundle += '\nwindow.__Game = Game;\n';

const save = {
  character: 'benny', bandCash: 9999, starMeter: 50, hasLid: true, tutorialComplete: true,
  inventories: {
    instruments: ['trash-lid', 'bass'],
    songs: ['neon-lights', 'rebel-pulse'],
    clothes: ['street-tee', 'sparkle-jacket'],
    makeup: ['glitter-eyes'],
    accessories: ['cool-shades', 'top-hat'],
  },
  bandMembers: [{ id: 'riff', name: 'Riff', emoji: '🎸', role: 'Lead' }], bandSlots: 2,
  currentVenue: 'street-corner',
  equippedInstrument: 'trash-lid', equippedSong: 'neon-lights',
  equippedWear: { clothes: null, makeup: null, accessories: null }, gigBandIds: ['riff'],
};
window.localStorage.setItem('bandland_save_v2', JSON.stringify(save));

window.eval(bundle);

const doc = window.document;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const savedState = () => JSON.parse(window.localStorage.getItem('bandland_save_v2'));
const click = (sel) => {
  const el = doc.querySelector(sel);
  if (!el) return false;
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  return true;
};
const has = (sel) => !!doc.querySelector(sel);
let failures = 0;
const log = (name, ok, extra = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
};

window.__Game.init();
log('Title renders', has('#btn-continue'));

click('#btn-continue');
await sleep(50);
log('Hub renders', has('.hub-screen'));

click('#btn-greenroom');
await sleep(2000);
log('Green Room renders', has('.greenroom-screen'));
log('Bandmate drawn in room', has('.gr-bandmate'));
log('Curtain inert after transition', doc.getElementById('stage-curtain').style.pointerEvents === 'none');

click('[data-equip-cat="clothes"][data-equip="sparkle-jacket"]');
await sleep(50);
log('Equip clothes', savedState().equippedWear?.clothes === 'sparkle-jacket');
click('[data-equip-cat="makeup"][data-equip="glitter-eyes"]');
await sleep(50);
log('Equip makeup', savedState().equippedWear?.makeup === 'glitter-eyes');
click('[data-equip-cat="accessories"][data-equip="top-hat"]');
await sleep(50);
log('Equip accessory', savedState().equippedWear?.accessories === 'top-hat');
click('[data-equip-cat="instruments"][data-equip="bass"]');
await sleep(50);
log('Equip instrument', savedState().equippedInstrument === 'bass');
click('[data-equip-cat="songs"][data-equip="rebel-pulse"]');
await sleep(50);
log('Equip song', savedState().equippedSong === 'rebel-pulse');

click('[data-gig-toggle="riff"]');
await sleep(50);
log('Band gig toggle', savedState().gigBandIds?.length === 0);
click('.venue-card[data-venue="local-tavern"]');
await sleep(50);
log('Venue select', savedState().currentVenue === 'local-tavern');

click('.greenroom-screen [data-action="back-hub"]');
await sleep(300);
log('Home button from Green Room', has('.hub-screen'));

click('#btn-shop');
await sleep(50);
log('Shop opens', has('.shop-screen'));
click('.shop-tab[data-tab="clothes"]');
await sleep(50);
click('[data-buy-cat="clothes"][data-buy-id="tie-dye-tee"]');
await sleep(50);
log('Shop purchase', savedState().inventories.clothes.includes('tie-dye-tee'));
click('.shop-header [data-action="back-hub"]');
await sleep(300);
log('Shop back to hub', has('.hub-screen'));

// Recruit dialogue: fan saw the last show, flatters, joins the band
const st = window.Bandland.debugState;
st.pendingRecruit = { id: 'boom', name: 'Boom', emoji: '🥁', role: 'Drums', seenVenue: 'Local Tavern', seenSong: 'Neon Lights' };
st.recruitStep = 0;
window.Bandland.rerender();
await sleep(50);
const bubble = doc.querySelector('.recruit-dialogue .dlg-bubble')?.textContent || '';
log('Recruit dialogue opens', has('.recruit-dialogue'));
log('Flattery references venue + song', bubble.includes('Local Tavern') && bubble.includes('Neon Lights'), bubble.slice(0, 60));
click('[data-recruit-next]');
await sleep(50);
log('Dialogue advances to pitch', has('#btn-accept-recruit'));
click('#btn-accept-recruit');
await sleep(50);
log('Recruit joins band', savedState().bandMembers.some((m) => m.id === 'boom'));
log('Dialogue fields not saved on member', !savedState().bandMembers.some((m) => m.seenVenue));

if (errors.length) { console.log('PAGE ERRORS:\n' + errors.join('\n')); failures++; }
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
