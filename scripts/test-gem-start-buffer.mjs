import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
const page = await browser.newPage();
await page.goto('http://localhost:8899/?v=69', { waitUntil: 'networkidle0' });

const result = await page.evaluate(async () => {
  await SongLoader.loadSong('rebel-pulse');
  const song = getSong('rebel-pulse');
  const inst = INSTRUMENTS['trash-lid'];
  const bpm = song.bpm || 120;
  const partKey = 'Drums';
  const hitBeats = new Set();
  const missedBeats = new Set();
  const la = 5.0;

  const duringCountdown = getUpcomingNotes(song, partKey, 3.0, bpm, la, hitBeats, missedBeats, 0, inst, 4);
  const rightAfterCountdown = getUpcomingNotes(song, partKey, 6.5, bpm, la, hitBeats, missedBeats, 0, inst, 4);
  const settled = getUpcomingNotes(song, partKey, 8.0, bpm, la, hitBeats, missedBeats, 0, inst, 4);

  const closestDist = (notes, songElapsed) => notes.length
    ? Math.min(...notes.map((n) => n.hitElapsed - songElapsed))
    : null;

  return {
    gemChartStart: GEM_CHART_LEAD_SEC + GEM_MIN_APPROACH_SEC,
    duringCountdownCount: duringCountdown.length,
    rightAfterCountdownCount: rightAfterCountdown.length,
    settledCount: settled.length,
    closestAfterCountdown: closestDist(rightAfterCountdown, 2.5),
    firstGemTime: rightAfterCountdown[0]?.hitElapsed ?? settled[0]?.hitElapsed ?? null,
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();

const ok = result.duringCountdownCount === 0
  && result.rightAfterCountdownCount > 0
  && (result.closestAfterCountdown ?? 99) >= 1.0
  && (result.firstGemTime ?? 0) >= result.gemChartStart - 0.1;
process.exit(ok ? 0 : 1);
