import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();

await page.goto('http://localhost:8899/index.html?v=68', { waitUntil: 'networkidle0' });
const save = {
  character: 'benny', bandCash: 9999, starMeter: 50, hasLid: true, tutorialComplete: true,
  inventories: { instruments: ['bass'], songs: ['neon-lights'], clothes: [], makeup: [], accessories: [] },
  bandMembers: [], bandSlots: 1, currentVenue: 'street-corner',
  equippedInstrument: 'bass', equippedSong: 'neon-lights',
  equippedWear: { clothes: null, makeup: null, accessories: null }, gigBandIds: [],
};
await page.evaluate((s) => localStorage.setItem('bandland_save_v2', JSON.stringify(s)), save);
await page.reload({ waitUntil: 'networkidle0' });
await page.click('#btn-continue');
await page.waitForSelector('.hub-screen');
await page.click('#btn-perform');
await page.waitForSelector('.perform-screen', { timeout: 20000 });
await new Promise((r) => setTimeout(r, 6000));
await page.evaluate(() => StemPlayer.seek(59.85));

let sawOneSecond = false;
let completed = false;
for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 150));
  const snap = await page.evaluate(() => ({
    timer: document.getElementById('perf-timer')?.textContent,
    elapsed: +StemPlayer.getElapsed().toFixed(2),
    ended: StemPlayer.hasPlaybackEnded?.(),
    screen: document.getElementById('gig-results-layer')?.classList.contains('hidden') ? 'perform' : 'results',
    backBtn: !!document.querySelector('[data-action="back-hub"]'),
  }));
  if (snap.timer?.includes('1s')) sawOneSecond = true;
  if (snap.screen === 'results') {
    completed = true;
    console.log('completed at', (i * 0.15).toFixed(2) + 's', JSON.stringify(snap));
    break;
  }
}

console.log(JSON.stringify({ completed, ok: completed }));
await browser.close();
process.exit(completed ? 0 : 1);
