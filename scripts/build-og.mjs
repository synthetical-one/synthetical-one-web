import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';

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

// --- Per-character share cards -------------------------------------------
//
// Each character's shared link should unfurl showing *that* character, not
// the eight-up roster card above. One 1200x630 card per slug, background set
// to the character's canon colourHex (read straight from its frontmatter, so
// this can never drift from content), with their portrait scaled to fit
// comfortably and centred with generous margin. No text (see NOTE at top of
// og-default.png generation, above, for why sharp-rendered text is avoided).

// A single portrait alone (not eight-across) can read at a much larger
// scale than og-default.png's row does. All eight crops are narrow
// full-body figures (aspect ratios ~0.33-0.61, per crops.json), so height is
// always the binding constraint below MAX_WIDTH; capping height at 480px
// (~76% of the 630px canvas) leaves a 75px margin top and bottom, comfortably
// clear of the 1200px width even for the widest crop.
const CARD_MAX_HEIGHT = 480;
const CARD_MAX_WIDTH = 700;

// The character band (CharacterBand.astro) never sets a portrait loose on
// the colour field directly -- it always sits inside a bone (`--mount`)
// panel first, which is what makes the crop read as a deliberate specimen
// plate rather than a stray image. The per-character OG card must match
// that treatment: composite the portrait onto its own bone mount rectangle
// (a modest, even margin on all sides), then composite *that* mount onto
// the colour field. The band's mount padding is 14px at its ~400px portrait
// scale; this card's portraits run up to 480px, and the card itself is
// viewed at social-share scale (often shrunk in a feed), so the margin is
// scaled up accordingly rather than reused verbatim.
const MOUNT_MARGIN = 32;

function readColourHex(slug) {
  const raw = readFileSync(`src/content/characters/${slug}.md`, 'utf8');
  const match = raw.match(/^colourHex:\s*"?(#[0-9A-Fa-f]{6})"?/m);
  if (!match) throw new Error(`no colourHex frontmatter found for ${slug}`);
  return match[1];
}

mkdirSync('public/og', { recursive: true });

for (const slug of SLUGS) {
  const colourHex = readColourHex(slug);
  // fit: 'inside' with withoutEnlargement: false lets small source portraits
  // (e.g. gyro.png at 216x356) upscale to fill the target box, matching
  // CharacterBand's own treatment of the same crops -- see the NOTE above
  // CARD_MAX_HEIGHT for why that's the right call here too.
  const portraitBuffer = await sharp(`src/assets/characters/${slug}.png`)
    .resize({
      width: CARD_MAX_WIDTH,
      height: CARD_MAX_HEIGHT,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  const portraitMeta = await sharp(portraitBuffer).metadata();

  // Bone mount panel: the portrait plus an even margin on all sides,
  // matching the band's specimen-plate treatment (see MOUNT_MARGIN note).
  const mountWidth = portraitMeta.width + MOUNT_MARGIN * 2;
  const mountHeight = portraitMeta.height + MOUNT_MARGIN * 2;
  const mountBuffer = await sharp({
    create: {
      width: mountWidth,
      height: mountHeight,
      channels: 3,
      background: BACKGROUND,
    },
  })
    .composite([{ input: portraitBuffer, left: MOUNT_MARGIN, top: MOUNT_MARGIN }])
    .png()
    .toBuffer();

  const left = Math.round((CANVAS_WIDTH - mountWidth) / 2);
  const top = Math.round((CANVAS_HEIGHT - mountHeight) / 2);

  await sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 3,
      background: colourHex,
    },
  })
    .composite([{ input: mountBuffer, left, top }])
    .png()
    .toFile(`public/og/${slug}.png`);

  console.log(
    `wrote public/og/${slug}.png (${CANVAS_WIDTH}x${CANVAS_HEIGHT}), field ${colourHex}, portrait ${portraitMeta.width}x${portraitMeta.height}, mount ${mountWidth}x${mountHeight}`,
  );
}
