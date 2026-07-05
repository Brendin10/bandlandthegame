import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();

await page.goto('http://localhost:8899/?v=61', { waitUntil: 'networkidle0' }).catch(async () => {
  await page.goto('http://localhost:8899/index.html?v=61', { waitUntil: 'networkidle0' });
});

const save = {
  character: 'benny',
  bandCash: 500,
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

await page.evaluate((s) => {
  localStorage.setItem('bandland_save_v2', JSON.stringify(s));
}, save);
await page.reload({ waitUntil: 'networkidle0' });
await page.click('#btn-continue');
await page.waitForSelector('.hub-screen');
await page.click('#btn-shop');
await page.waitForSelector('.shop-screen');
await page.click('button.shop-tab[data-tab="songs"]');
await new Promise((r) => setTimeout(r, 300));

const result = await page.evaluate(() => {
  const text = document.body.innerText;
  const buyBtns = [...document.querySelectorAll('[data-buy-cat="songs"]')].map((b) => ({
    id: b.dataset.buyId,
    cost: b.textContent,
  }));
  return {
    hasNeonLights: text.includes('Neon Lights'),
    hasPrice120: text.includes('$120'),
    songIds: typeof SONG_MANIFEST !== 'undefined' ? SONG_MANIFEST.map((s) => s.id) : [],
    shopTab: document.querySelector('.shop-tab.active')?.dataset?.tab,
    buyBtns,
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.buyBtns.some((b) => b.id === 'neon-lights' && b.cost === '$120') ? 0 : 1);
