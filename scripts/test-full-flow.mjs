import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:8899/?v=78';
const TEST_SAVE = {
  character: 'benny', bandCash: 9999, starMeter: 50, hasLid: true, tutorialComplete: true,
  inventories: { instruments: ['bass', 'trash-lid'], songs: ['neon-lights', 'rebel-pulse'], clothes: [], makeup: [], accessories: [] },
  bandMembers: [], bandSlots: 1, currentVenue: 'street-corner',
  equippedInstrument: 'bass', equippedSong: 'neon-lights',
  equippedWear: { clothes: null, makeup: null, accessories: null }, gigBandIds: [],
};

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
const issues = [];
const log = (step, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${step}${detail ? `: ${detail}` : ''}`);
  if (!ok) issues.push({ step, detail });
};

try {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  log('Title loads', (await page.title()).includes('Bandland'));

  await page.evaluate((s) => localStorage.setItem('bandland_save_v2', JSON.stringify(s)), TEST_SAVE);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('#btn-continue');
  await page.waitForSelector('.hub-screen', { timeout: 10000 });
  log('Hub loads', true);

  await page.click('#btn-shop');
  await page.waitForSelector('.shop-screen', { timeout: 5000 });
  log('Shop opens', true);
  await page.evaluate(() => document.querySelector('.shop-header [data-action="back-hub"]')?.click());
  await new Promise((r) => setTimeout(r, 300));
  await page.waitForSelector('.hub-screen', { timeout: 5000 });

  await page.click('#btn-perform');
  await page.waitForSelector('.perform-screen', { timeout: 30000 });
  log('Gig starts', true);

  await new Promise((r) => setTimeout(r, 1500));
  const earlyGems = await page.evaluate(() => document.querySelectorAll('.note-gem').length);
  log('Countdown gating', earlyGems <= 1, `gems=${earlyGems}`);

  await new Promise((r) => setTimeout(r, 6000));
  const overlap = await page.evaluate(() => {
    const gems = [...document.querySelectorAll('.note-gem')].map((g) => {
      const left = parseFloat(g.style.left) || 0;
      const width = parseFloat(g.style.width) || 0;
      const half = g.classList.contains('hold') ? 0 : width / 2;
      return { leftEdge: left - half, rightEdge: left + half };
    }).sort((a, b) => a.leftEdge - b.leftEdge);
    for (let i = 1; i < gems.length; i++) {
      if (gems[i].leftEdge < gems[i - 1].rightEdge - 0.1) return true;
    }
    return false;
  });
  log('No gem overlap', !overlap);

  const end = await page.evaluate(async () => {
    const dur = StemPlayer.getDuration?.() || 60;
    StemPlayer.seek(Math.max(0, dur - 0.05));
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const layer = document.getElementById('gig-results-layer');
      if (layer && !layer.classList.contains('hidden')) {
        return {
          text: layer.textContent.slice(0, 80),
          complete: layer.textContent.includes('Gig Complete'),
          achievements: !!layer.querySelector('.achievements-section'),
          back: !!layer.querySelector('[data-action="back-hub"]'),
          sawZero: document.getElementById('perf-timer')?.textContent?.includes('0s'),
        };
      }
    }
    return null;
  });
  log('Timer hits 0', !!(end?.sawZero || end?.complete), end?.sawZero ? '0s' : 'via seek');
  log('Results overlay', !!end?.complete);
  log('Achievements section', !!end?.achievements);
  log('Back to Map', !!end?.back);

  if (end?.back) {
    await page.click('#gig-results-layer [data-action="back-hub"]');
    await new Promise((r) => setTimeout(r, 400));
    const hub = await page.evaluate(() => ({
      hub: !!document.querySelector('.hub-screen'),
      hidden: document.getElementById('gig-results-layer')?.classList.contains('hidden'),
    }));
    log('Return to hub', hub.hub && hub.hidden, JSON.stringify(hub));
  }

  console.log(`\n--- ${issues.length ? `${issues.length} ISSUE(S)` : 'ALL PASSED'} ---`);
} catch (err) {
  console.error('Fatal:', err.message);
  issues.push({ step: 'fatal', detail: err.message });
} finally {
  await browser.close();
}
process.exit(issues.length ? 1 : 0);
