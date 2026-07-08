import puppeteer from 'puppeteer-core';

const SAVE = {
  character: 'benny',
  bandCash: 999,
  starMeter: 0,
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

await page.goto('http://localhost:8899/?v=58', { waitUntil: 'networkidle0' });
await page.evaluate((save) => {
  localStorage.setItem('bandland_save_v2', JSON.stringify(save));
}, SAVE);
await page.reload({ waitUntil: 'networkidle0' });
await page.click('#btn-continue');
await page.waitForSelector('.hub-screen');

// Simulate gig results overlay with curtain blocking (the reported bug scenario)
const result = await page.evaluate(async () => {
  const curtain = document.getElementById('stage-curtain');
  curtain.className = 'stage-curtain curtain-opening';
  curtain.style.pointerEvents = 'auto';
  curtain.style.opacity = '1';
  curtain.style.visibility = 'visible';

  const layer = document.getElementById('gig-results-layer');
  layer.innerHTML = `
    <section class="screen results-screen">
      <h2>Gig Complete! 🎉</h2>
      <button type="button" class="btn btn-primary btn-lg" data-action="back-hub">Back to Map</button>
    </section>
  `;
  layer.classList.remove('hidden');
  layer.querySelector('[data-action="back-hub"]').onclick = () => window.Bandland.exitToHub();

  layer.querySelector('[data-action="back-hub"]').click();
  await new Promise((r) => setTimeout(r, 1100));

  return {
    hasLayer: !!document.getElementById('gig-results-layer'),
    onHub: !!document.querySelector('.greenroom-screen'),
    overlayHidden: document.getElementById('gig-results-layer')?.classList.contains('hidden'),
    curtainPE: getComputedStyle(curtain).pointerEvents,
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.onHub && result.overlayHidden ? 0 : 1);
