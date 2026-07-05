import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.goto('http://localhost:8899/?v=73', { waitUntil: 'networkidle0' });

const result = await page.evaluate(async () => {
  await SongLoader.loadSong('neon-lights');
  const song = getSong('neon-lights');
  const inst = INSTRUMENTS['bass'];
  const bpm = song.bpm || 120;
  const elapsed = 7.5; // songElapsed ~3.5, dense gem batch
  const notes = getUpcomingNotes(song, 'Keys', elapsed, bpm, 5.0, new Set(), new Set(), 0, inst, 4);
  const beatDur = 60 / bpm;
  const laSec = 5.0 * beatDur;
  const span = 70;
  const HIT_X = 18;
  const songElapsed = elapsed - 4;
  const LOOKAHEAD = 5;

  const gems = notes.map((n) => {
    const distSec = n.hitElapsed - songElapsed;
    const pct = HIT_X + (distSec / laSec) * span;
    const isHold = (n.dur || 1) > 1.05;
    const width = isHold
      ? Math.min(span * 0.55, Math.max(10, ((n.dur || 1) / LOOKAHEAD) * span * 0.9))
      : Math.min(span * 0.1, Math.max(5, ((n.dur || 1) / LOOKAHEAD) * span * 0.48));
    return { beat: n.beat, pct: +pct.toFixed(1), width: +width.toFixed(1), left: +(pct - width / 2).toFixed(1), right: +(pct + width / 2).toFixed(1) };
  }).sort((a, b) => a.pct - b.pct);

  let overlap = false;
  for (let i = 1; i < gems.length; i++) {
    if (gems[i].left < gems[i - 1].right) overlap = true;
  }
  return { count: gems.length, gems, overlap };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.overlap ? 1 : 0);
