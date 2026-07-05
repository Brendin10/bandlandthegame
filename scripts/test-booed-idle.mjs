import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.goto('http://localhost:8899/?v=78', { waitUntil: 'networkidle0' });
await page.evaluate(() => {
  localStorage.setItem('bandland_save_v2', JSON.stringify({
    character: 'benny', bandCash: 0, starMeter: 0, hasLid: true, tutorialComplete: true,
    inventories: { instruments: ['trash-lid'], songs: ['rebel-pulse'], clothes: [], makeup: [], accessories: [] },
    bandMembers: [], bandSlots: 1, currentVenue: 'street-corner',
    equippedInstrument: 'trash-lid', equippedSong: 'rebel-pulse',
    equippedWear: { clothes: null, makeup: null, accessories: null }, gigBandIds: [],
  }));
});
await page.reload({ waitUntil: 'networkidle0' });
await page.click('#btn-continue');
await page.waitForSelector('.hub-screen');
await page.click('#btn-perform');
await page.waitForSelector('.perform-screen', { timeout: 30000 });
await page.waitForFunction(() => Metronome.getElapsed() >= 8, { timeout: 15000 });

let booed = false;
for (let i = 0; i < 80; i++) {
  await new Promise((r) => setTimeout(r, 200));
  booed = await page.evaluate(() => {
    const layer = document.getElementById('gig-results-layer');
    return layer && !layer.classList.contains('hidden') && layer.textContent.includes('BOOED');
  });
  if (booed) break;
}

console.log('Booed from idle misses:', booed);
await browser.close();
process.exit(booed ? 0 : 1);
