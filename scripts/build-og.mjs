import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

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
// the eight-up roster card above. One 1200x630 card per slug, matching the
// site's own poster/plate split (CharacterBand.astro): poster-mode
// characters (Echo, Prompt) stand as a transparent cut-out directly on their
// field with no mount; plate-mode characters sit on their duotone plate,
// mounted on bone, on their field. Background is the character's fieldHex
// (read straight from its frontmatter, so this can never drift from
// content) -- not colourHex, which is a different, frozen canon value. No
// text (see NOTE at top of og-default.png generation, above, for why
// sharp-rendered text is avoided).

// A single portrait alone (not eight-across) can read at a much larger
// scale than og-default.png's row does. All eight crops are narrow
// full-body figures (aspect ratios ~0.33-0.61, per crops.json), so height is
// always the binding constraint below MAX_WIDTH; capping height at 480px
// (~76% of the 630px canvas) leaves a 75px margin top and bottom, comfortably
// clear of the 1200px width even for the widest crop.
const CARD_MAX_HEIGHT = 480;
const CARD_MAX_WIDTH = 700;

// For plate-mode characters, the character band (CharacterBand.astro) never
// sets the duotone loose on the colour field directly -- it always sits
// inside a bone (`--mount`) panel first, which is what makes the crop read
// as a deliberate specimen plate rather than a stray image. The
// per-character OG card must match that treatment: composite the plate onto
// its own bone mount rectangle (a modest, even margin on all sides), then
// composite *that* mount onto the colour field. The band's mount padding is
// 14px at its ~340px plate scale; this card's plates run up to 480px, and
// the card itself is viewed at social-share scale (often shrunk in a feed),
// so the margin is scaled up accordingly rather than reused verbatim.
// Poster-mode characters get no mount at all -- see the loop below.
const MOUNT_MARGIN = 32;

// Read a hex colour straight out of a character's frontmatter. Generalised
// from the field-name-agnostic pattern shared with build-duotone.mjs's
// (formerly identically-named) readColourHex, so the same helper now serves
// both fieldHex (the stage a character stands on) and colourHex (their
// frozen canon colour) without duplicating the parsing logic per field.
function readFrontmatterHex(slug, field) {
  const raw = readFileSync(`src/content/characters/${slug}.md`, 'utf8');
  const pattern = new RegExp(`^${field}:\\s*"?(#[0-9A-Fa-f]{6})"?`, 'm');
  const match = raw.match(pattern);
  if (!match) throw new Error(`no ${field} frontmatter found for ${slug}`);
  return match[1];
}

mkdirSync('public/og', { recursive: true });

for (const slug of SLUGS) {
  const field = readFrontmatterHex(slug, 'fieldHex');

  // Poster-mode characters (Echo, Prompt) have a transparent cut-out that
  // sits directly on the field, matching the site -- no bone mount. Plate-
  // mode characters keep the bone mount around their duotone plate, which is
  // what makes the crop read as a deliberate specimen rather than a stray
  // rectangle (see MOUNT_MARGIN note below).
  const cutout = `src/assets/cutouts/${slug}.png`;
  const hasCutout = existsSync(cutout);
  const source = hasCutout ? cutout : `src/assets/duotone/${slug}.png`;

  // fit: 'inside' with withoutEnlargement: false lets small source images
  // upscale to fill the target box, matching CharacterBand's own treatment
  // of the same crops -- see the NOTE above CARD_MAX_HEIGHT for why that's
  // the right call here too.
  const figureBuffer = await sharp(source)
    .resize({
      width: CARD_MAX_WIDTH,
      height: CARD_MAX_HEIGHT,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  const figureMeta = await sharp(figureBuffer).metadata();

  // What gets centred on the field: the bare cut-out for poster mode, or the
  // duotone plate wrapped in its bone mount for plate mode.
  let mountBuffer = figureBuffer;
  let mountWidth = figureMeta.width;
  let mountHeight = figureMeta.height;

  if (!hasCutout) {
    // Bone mount panel: the plate plus an even margin on all sides,
    // matching the band's specimen-plate treatment (see MOUNT_MARGIN note).
    mountWidth = figureMeta.width + MOUNT_MARGIN * 2;
    mountHeight = figureMeta.height + MOUNT_MARGIN * 2;
    mountBuffer = await sharp({
      create: {
        width: mountWidth,
        height: mountHeight,
        channels: 3,
        background: BACKGROUND,
      },
    })
      .composite([{ input: figureBuffer, left: MOUNT_MARGIN, top: MOUNT_MARGIN }])
      .png()
      .toBuffer();
  }

  const left = Math.round((CANVAS_WIDTH - mountWidth) / 2);
  const top = Math.round((CANVAS_HEIGHT - mountHeight) / 2);

  await sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 3,
      background: field,
    },
  })
    .composite([{ input: mountBuffer, left, top }])
    .png()
    .toFile(`public/og/${slug}.png`);

  console.log(
    `wrote public/og/${slug}.png (${CANVAS_WIDTH}x${CANVAS_HEIGHT}), mode ${hasCutout ? 'poster' : 'plate'}, field ${field}, figure ${figureMeta.width}x${figureMeta.height}, mount ${mountWidth}x${mountHeight}`,
  );
}
