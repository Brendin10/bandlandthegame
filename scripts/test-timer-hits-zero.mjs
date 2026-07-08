import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();

await page.goto('http://localhost:8899/?v=78', { waitUntil: 'networkidle0' });
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
await page.click('#btn-greenroom');
await page.waitForSelector('.greenroom-screen', { timeout: 10000 });
await new Promise((r) => setTimeout(r, 1800));
await page.click('#btn-perform');
await page.waitForSelector('.perform-screen', { timeout: 20000 });
await new Promise((r) => setTimeout(r, 6000));

const result = await page.evaluate(async () => {
  const logs = [];
  const dur = StemPlayer.getDuration();
  StemPlayer.seek(Math.max(0, dur - 0.08));

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 100));
    logs.push({
      t: (i * 0.1).toFixed(1),
      timer: document.getElementById('perf-timer')?.textContent,
      timeLeft: window.__p?.timeLeft,
      elapsed: +StemPlayer.getElapsed().toFixed(2),
      ended: StemPlayer.hasPlaybackEnded?.(),
      results: !document.getElementById('gig-results-layer')?.classList.contains('hidden'),
    });
    if (logs.at(-1).results) break;
  }

  return {
    logs,
    sawZero: logs.some((l) => l.timer?.includes('0s')),
    sawOneAtEnd: logs.some((l) => l.results && l.timer?.includes('1s')),
    reachedResults: logs.some((l) => l.results),
    hasBackBtn: !!document.querySelector('#gig-results-layer [data-action="back-hub"]'),
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();

const ok = result.sawZero && result.reachedResults && result.hasBackBtn && !result.sawOneAtEnd;
process.exit(ok ? 0 : 1);
