import puppeteer from 'puppeteer-core';

const SAVE = {
  character: 'benny',
  bandCash: 999,
  starMeter: 50,
  hasLid: true,
  tutorialComplete: true,
  inventories: {
    instruments: ['trash-lid'],
    songs: ['rebel-pulse'],
    clothes: [],
    makeup: [],
    accessories: [],
  },
  bandMembers: [],
  bandSlots: 1,
  currentVenue: 'street-corner',
  equippedInstrument: 'trash-lid',
  equippedSong: 'rebel-pulse',
  equippedWear: { clothes: null, makeup: null, accessories: null },
  gigBandIds: [],
};

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();

await page.goto('http://localhost:8899/?v=67', { waitUntil: 'networkidle0' });
await page.evaluate((save) => {
  localStorage.setItem('bandland_save_v2', JSON.stringify(save));
}, SAVE);
await page.reload({ waitUntil: 'networkidle0' });
await page.click('#btn-continue');
await page.waitForSelector('.hub-screen');

const result = await page.evaluate(async () => {
  const layer = document.getElementById('gig-results-layer');
  layer.innerHTML = `
    <section class="screen results-screen">
      <h2>Gig Complete! 🎉</h2>
      <button type="button" class="btn btn-primary btn-lg" data-action="back-hub">Back to Map</button>
    </section>
  `;
  layer.classList.remove('hidden');

  const btn = layer.querySelector('[data-action="back-hub"]');
  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTimeout(() => window.Bandland.exitToHub(), 0);
  };
  btn.click();

  await new Promise((r) => setTimeout(r, 600));

  return {
    hasHub: !!document.querySelector('.hub-screen'),
    hasPerform: !!document.querySelector('.perform-screen'),
    hasVenueGrid: !!document.querySelector('.venue-grid'),
    hasChooseVenue: document.body.innerText.includes('Choose Your Venue'),
    overlayHidden: layer.classList.contains('hidden'),
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();

const ok = result.hasHub && !result.hasPerform && result.hasVenueGrid
  && result.hasChooseVenue && result.overlayHidden;
process.exit(ok ? 0 : 1);
