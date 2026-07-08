import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:8899/?v=78&test=1';
const SAVE = {
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
const log = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`);
  if (!ok) issues.push(name);
};

async function loadAndStartGig() {
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await page.evaluate((s) => localStorage.setItem('bandland_save_v2', JSON.stringify(s)), SAVE);
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('#btn-continue');
  await page.waitForSelector('.hub-screen', { timeout: 10000 });
  await enterGreenRoom();
  await page.click('#btn-perform');
  await page.waitForSelector('.perform-screen', { timeout: 30000 });
}

async function enterGreenRoom() {
  await page.click('#btn-greenroom');
  await page.waitForSelector('.greenroom-screen', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 1800));
}

async function waitForOverlay(maxMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const snap = await page.evaluate(() => {
      const layer = document.getElementById('gig-results-layer');
      return {
        open: layer && !layer.classList.contains('hidden'),
        text: layer?.textContent?.slice(0, 60) || '',
        back: !!layer?.querySelector('[data-action="back-hub"]'),
        perform: !!document.querySelector('.perform-screen'),
        backstage: !!document.querySelector('.greenroom-screen'),
      };
    });
    if (snap.open && snap.back) return snap;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

try {
  // Test 1: Song completion shows overlay and returns to hub
  await loadAndStartGig();
  await new Promise((r) => setTimeout(r, 7000));
  await page.evaluate(async () => {
    const dur = StemPlayer.getDuration?.() || 60;
    StemPlayer.seek(Math.max(0, dur - 0.05));
  });
  const results = await waitForOverlay(6000);
  log('Song end overlay', !!results?.open, results?.text);
  log('Song end Back button', !!results?.back);
  log('Green Room under overlay', !!results?.backstage);

  if (results?.back) {
    await page.click('#gig-results-layer [data-action="back-hub"]');
    await new Promise((r) => setTimeout(r, 1100));
    const hub = await page.evaluate(() => ({
      backstage: !!document.querySelector('.greenroom-screen'),
      overlayHidden: document.getElementById('gig-results-layer')?.classList.contains('hidden'),
      performGone: !document.querySelector('.perform-screen'),
    }));
    log('Back to Green Room after song', hub.backstage && hub.overlayHidden && hub.performGone, JSON.stringify(hub));
  }

  // Exiting a gig now lands in the Green Room; wait out the curtain
  // transition + perform suppress cooldown, then start the next gig.
  await new Promise((r) => setTimeout(r, 2400));
  await page.waitForSelector('.greenroom-screen', { timeout: 10000 });

  // Test 2: Booed end screen
  await page.click('#btn-perform');
  await page.waitForSelector('.perform-screen', { timeout: 30000 });
  await page.waitForFunction(
    () => typeof Metronome !== 'undefined' && Metronome.getElapsed() >= 4,
    { timeout: 15000 }
  );
  await page.evaluate(() => window.Bandland.endGig('booed'));
  const booedSnap = await waitForOverlay(5000);
  log('Booed overlay', !!booedSnap?.open && booedSnap?.text?.includes('BOOED'), booedSnap?.text);

  if (booedSnap?.back) {
    await page.click('#gig-results-layer [data-action="back-hub"]');
    await new Promise((r) => setTimeout(r, 1100));
    const hub2 = await page.evaluate(() => ({
      backstage: !!document.querySelector('.greenroom-screen'),
      overlayHidden: document.getElementById('gig-results-layer')?.classList.contains('hidden'),
    }));
    log('Back to Green Room after booed', hub2.backstage && hub2.overlayHidden, JSON.stringify(hub2));
  }

  // Test 3: Watchdog recovery when overlay flag set but layer empty
  await new Promise((r) => setTimeout(r, 2400));
  await page.waitForSelector('.greenroom-screen', { timeout: 10000 });
  await page.click('#btn-perform');
  await page.waitForSelector('.perform-screen', { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 7000));
  const recovery = await page.evaluate(async () => {
    const dur = StemPlayer.getDuration?.() || 60;
    StemPlayer.seek(Math.max(0, dur - 0.05));
    const layer = document.getElementById('gig-results-layer');
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      if (layer && !layer.classList.contains('hidden') && layer.textContent.includes('Gig Complete')) {
        layer.classList.add('hidden');
        layer.innerHTML = '';
        window.Bandland.endGig('results');
        await new Promise((r) => setTimeout(r, 600));
        return {
          recovered: layer && !layer.classList.contains('hidden') && layer.textContent.includes('Gig Complete'),
        };
      }
    }
    return { recovered: false };
  });
  log('Watchdog recovery after broken overlay', recovery?.recovered, JSON.stringify(recovery));

  console.log(`\n--- ${issues.length ? `${issues.length} FAILED` : 'ALL PASSED'} ---`);
} catch (err) {
  console.error('Fatal:', err.message);
  issues.push('fatal');
} finally {
  await browser.close();
}
process.exit(issues.length ? 1 : 0);
