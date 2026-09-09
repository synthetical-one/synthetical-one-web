import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// Canon order per src/content/characters/*.md frontmatter (`order: 1`-`8`):
// gyro, valve, hikmah, ledger, echo, roam, prism, prompt.
const SLUGS = [
  'gyro',
  'valve',
  'hikmah',
  'ledger',
  'echo',
  'roam',
  'prism',
  'prompt',
];

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
const BACKGROUND = '#EDE9DD'; // --bone

// NOTE on scale: the eight portraits are narrow full-body figures (aspect
// ratios ~0.33-0.61, summing to ~3.67). Packed edge-to-edge in a single row
// with zero margins and zero gaps, the tallest achievable common height is
// CANVAS_WIDTH / aspectSum =~ 326px (~52% of 630px) -- nowhere near the
// 70-75% (440-470px) that would look right for a single portrait alone.
// Eight-across is a hard width constraint, not a tuning knob: any margin or
// gap we keep only lowers that ceiling further. SIDE_MARGIN/GAP below are
// chosen as the smallest values that still read as deliberate framing
// (rather than edge-to-edge clipping), maximizing height within that limit.
const SIDE_MARGIN = 32;
const GAP = 10;

// Read each portrait's natural size so we can solve for a common height that
// makes the whole row (8 portraits + 7 gaps + 2 side margins) fit exactly
// within the canvas width.
const portraits = [];
for (const slug of SLUGS) {
  const path = `src/assets/characters/${slug}.png`;
  const meta = await sharp(path).metadata();
  portraits.push({ slug, path, aspect: meta.width / meta.height });
}

const gapsTotal = GAP * (portraits.length - 1);
const availableWidth = CANVAS_WIDTH - 2 * SIDE_MARGIN - gapsTotal;
const aspectSum = portraits.reduce((sum, p) => sum + p.aspect, 0);
const targetHeight = Math.round(availableWidth / aspectSum);

// Resize every portrait to that shared height, then read back its actual
// resized width (avoids compounding rounding error from the aspect ratio).
const resized = [];
let rowWidth = 0;
for (const p of portraits) {
  const buffer = await sharp(p.path)
    .resize({ height: targetHeight })
    .png()
    .toBuffer();
  const meta = await sharp(buffer).metadata();
  resized.push({ ...p, buffer, width: meta.width, height: meta.height });
  rowWidth += meta.width;
}
rowWidth += gapsTotal;

// Center the row horizontally (absorbs any rounding slack). Every portrait
// was resized to the same targetHeight, so they already share a bottom
// baseline within the row; center that whole block vertically so the bone
// margin above and below the figures is equal.
const startX = Math.round((CANVAS_WIDTH - rowWidth) / 2);
const rowTop = Math.round((CANVAS_HEIGHT - targetHeight) / 2);

const composites = [];
let x = startX;
for (const r of resized) {
  composites.push({ input: r.buffer, left: x, top: rowTop });
  x += r.width + GAP;
}

mkdirSync('public', { recursive: true });

await sharp({
  create: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    channels: 3,
    background: BACKGROUND,
  },
})
  .composite(composites)
  .png()
  .toFile('public/og-default.png');

console.log(
  `wrote public/og-default.png (${CANVAS_WIDTH}x${CANVAS_HEIGHT}), portrait height ${targetHeight}px, row width ${rowWidth}px, startX ${startX}, rowTop ${rowTop}`,
);
