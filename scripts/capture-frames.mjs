import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const LABEL_HEIGHT = 22;

function usage() {
  console.error(
    'Usage: node scripts/capture-frames.mjs <svg> <outputDir> [times] [scale]\n' +
      '  times  comma separated seconds, default "0,0.5,1,2,3.5,5,7"\n' +
      '  scale  render scale relative to the SVG width, default 0.86\n' +
      '  CHROME_PATH overrides the browser binary.',
  );
}

const [svgArg, outArg, timesArg, scaleArg] = process.argv.slice(2);
if (!svgArg || !outArg) {
  usage();
  process.exit(1);
}

const chrome = CHROME_CANDIDATES.find((candidate) => {
  try {
    execFileSync(candidate, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});
if (!chrome) {
  console.error('No Chrome or Chromium binary found. Set CHROME_PATH.');
  process.exit(1);
}

const times = (timesArg ?? '0,0.5,1,2,3.5,5,7').split(',').map(Number);
const scale = Number(scaleArg ?? 0.86);
const outputDir = resolve(outArg);
mkdirSync(outputDir, { recursive: true });

const svg = readFileSync(resolve(svgArg), 'utf8').replace(/^<\?xml[^>]*\?>\s*/, '');
const width = Math.round(Number(/width="(\d+)"/.exec(svg)?.[1] ?? 960) * scale);
const height = Math.round(Number(/height="(\d+)"/.exec(svg)?.[1] ?? 1200) * scale);

const tiles = [];
for (const time of times) {
  const htmlPath = join(outputDir, `frame-${time}.html`);
  const pngPath = join(outputDir, `frame-${time}.png`);
  writeFileSync(
    htmlPath,
    `<!doctype html><meta charset="utf-8">` +
      `<style>html,body{margin:0;background:#000}svg{width:${width}px;height:${height}px;display:block}</style>` +
      `${svg}<script>const s=document.querySelector('svg');s.pauseAnimations();s.setCurrentTime(${time});</script>`,
  );
  execFileSync(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      `--screenshot=${pngPath}`,
      '--virtual-time-budget=1200',
      `file://${htmlPath}`,
    ],
    { stdio: 'ignore' },
  );
  const label = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LABEL_HEIGHT}">` +
      `<rect width="${width}" height="${LABEL_HEIGHT}" fill="#000"/>` +
      `<text x="8" y="16" font-family="monospace" font-size="13" fill="#5ec8e0">t = ${time}s</text></svg>`,
  );
  const frame = await sharp(pngPath).resize(width, height, { fit: 'contain', background: '#000' }).toBuffer();
  tiles.push(
    await sharp({ create: { width, height: height + LABEL_HEIGHT, channels: 3, background: '#000' } })
      .composite([
        { input: label, top: 0, left: 0 },
        { input: frame, top: LABEL_HEIGHT, left: 0 },
      ])
      .png()
      .toBuffer(),
  );
  console.log(`captured t=${time}s`);
}

const columns = Number(process.env.COLUMNS_PER_ROW ?? 3);
const rows = Math.ceil(tiles.length / columns);
const sheet = join(outputDir, 'contact-sheet.png');
await sharp({
  create: {
    width: width * Math.min(columns, tiles.length),
    height: (height + LABEL_HEIGHT) * rows,
    channels: 3,
    background: '#111111',
  },
})
  .composite(
    tiles.map((input, index) => ({
      input,
      left: (index % columns) * width,
      top: Math.floor(index / columns) * (height + LABEL_HEIGHT),
    })),
  )
  .png()
  .toFile(sheet);
console.log(`contact sheet: ${sheet}`);
