import puppeteer from 'puppeteer-core';

const cases = [
  { inst: 'bass', song: 'neon-lights', expectStem: 'Bass' },
  { inst: 'electric-guitar', song: 'neon-lights', expectStem: 'Lead' },
  { inst: 'drums', song: 'neon-lights', expectStem: 'Drums' },
  { inst: 'keys', song: 'neon-lights', expectStem: 'Keys' },
];

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

let failed = 0;
for (const tc of cases) {
  const page = await browser.newPage();
  const hits = [];
  page.on('pageerror', (e) => hits.push({ error: e.message }));

  await page.goto('http://localhost:8899/index.html?v=64', { waitUntil: 'networkidle0' });
  const save = {
    character: 'benny', bandCash: 9999, starMeter: 50, hasLid: true, tutorialComplete: true,
    inventories: {
      instruments: ['bass', 'electric-guitar', 'drums', 'keys', 'trash-lid'],
      songs: ['neon-lights', 'rebel-pulse'], clothes: [], makeup: [], accessories: [],
    },
    bandMembers: [], bandSlots: 1, currentVenue: 'street-corner',
    equippedInstrument: tc.inst, equippedSong: tc.song,
    equippedWear: { clothes: null, makeup: null, accessories: null }, gigBandIds: [],
  };
  await page.evaluate((s) => localStorage.setItem('bandland_save_v2', JSON.stringify(s)), save);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('#btn-continue');
  await page.waitForSelector('.hub-screen');

  await page.evaluate((expectStem) => {
    const orig = StemPlayer.playHit;
    window.__hitLog = [];
    StemPlayer.playHit = (...args) => {
      window.__hitLog.push({ stemKey: args[0], note: args[1]?.beat });
      return orig.apply(StemPlayer, args);
    };
    window.__expectStem = expectStem;
  }, tc.expectStem);

  await page.click('#btn-greenroom');
  await page.waitForSelector('.greenroom-screen', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1800));
  await page.click('#btn-perform');
  await page.waitForSelector('.perform-screen', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 5500));

  await page.evaluate(() => {
    const btn = document.getElementById('btn-play-note');
    if (!btn) return;
    for (let i = 0; i < 8; i++) {
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse' }));
      btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'mouse' }));
    }
  });
  await new Promise((r) => setTimeout(r, 500));

  const result = await page.evaluate(() => ({
    stemsReady: window.__stemsReady,
    hasStem: StemPlayer.hasStem(window.__expectStem),
    hits: window.__hitLog || [],
    burstCalls: window.__burstCalls || 0,
    isStemBacked: SongLoader.getCached('neon-lights')?.stemBacked,
  }));

  const stemHits = result.hits.filter((h) => h.stemKey === tc.expectStem);
  const ok = stemHits.length > 0;
  console.log(JSON.stringify({ case: tc, ok, stemHits: stemHits.length, sample: result.hits[0] }));
  if (!ok) failed += 1;
  await page.close();
}

await browser.close();
process.exit(failed === 0 ? 0 : 1);
