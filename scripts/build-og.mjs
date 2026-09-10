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

// --- Poster wedge geometry -------------------------------------------------
//
// The site's poster bands are built on a hard diagonal split (see
// src/styles/tokens.css's --diagonal: 72% and CharacterBand.astro's
// `.band[data-mode='poster']::before` clip-path): a saturated field
// occupies the left 72% of the frame at the top, narrowing to 50% at the
// bottom, with a bone region filling the rest. The first pass at these
// cards dropped the mount (correctly) but also dropped the diagonal, which
// left poster-mode cards as a bare field with the figure floating dead
// centre -- no rectangle for the eye to land on the way plate-mode's mount
// gives it one. This restores the diagonal as a two-tone background, and
// moves the cut-out left-of-centre so its lower body stands astride the
// boundary rather than sitting entirely inside one region, matching how the
// character always straddles the line on the site.
//
// Built as a single SVG (field rect + bone polygon) rather than a
// clip-path composite, since sharp has no clip-path primitive of its own;
// an SVG string rasterized by sharp is the simplest way to get an
// anti-aliased diagonal edge in one shot.
const POSTER_FIELD_TOP_PCT = 0.72;
// The site recedes the diagonal only to 50% by the bottom of its own band,
// but that band reserves a ~26%-wide bone rail for text down its full
// height, so the site's diagonal never has to cross a standing figure to
// read as a boundary -- the rail is already bone regardless. This card has
// no rail: the only way the diagonal can do its job (read as a deliberate
// two-region split the figure stands astride, rather than a triangle
// floating behind it) is if it actually recedes far enough to cross the
// figure's own footprint. 30% -- checked by rendering both cards and
// reading them at og-share thumbnail scale -- is where that crossing
// becomes visible without the bone wedge swallowing the card.
const POSTER_FIELD_BOTTOM_PCT = 0.3;
// Left-of-centre anchor for the cut-out. Chosen (rather than derived from
// the site's grid, which reserves a text rail this card doesn't have) so
// that both poster figures' lower bodies cross the bottom diagonal by a
// visible margin while their tops stay clear inside the field -- verified
// by reading the rendered cards, not by formula alone.
const POSTER_FIGURE_CENTER_X = Math.round(CANVAS_WIDTH * 0.44);
const POSTER_BOTTOM_MARGIN = 40;

function posterFieldSvg(field) {
  const topX = CANVAS_WIDTH * POSTER_FIELD_TOP_PCT;
  const bottomX = CANVAS_WIDTH * POSTER_FIELD_BOTTOM_PCT;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}">
    <rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="${field}" />
    <polygon points="${topX},0 ${CANVAS_WIDTH},0 ${CANVAS_WIDTH},${CANVAS_HEIGHT} ${bottomX},${CANVAS_HEIGHT}" fill="${BACKGROUND}" />
  </svg>`);
}

mkdirSync('public/og', { recursive: true });

for (const slug of SLUGS) {
  const field = readFrontmatterHex(slug, 'fieldHex');

  // Poster-mode characters (Echo, Prompt) have a transparent cut-out that
  // sits directly on the field/bone diagonal, matching the site -- no bone
  // mount. Plate-mode characters keep the bone mount around their duotone
  // plate, which is what makes the crop read as a deliberate specimen
  // rather than a stray rectangle (see MOUNT_MARGIN note below).
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

  if (hasCutout) {
    const left = Math.round(POSTER_FIGURE_CENTER_X - figureMeta.width / 2);
    const top = CANVAS_HEIGHT - POSTER_BOTTOM_MARGIN - figureMeta.height;

    await sharp(posterFieldSvg(field))
      .composite([{ input: figureBuffer, left, top }])
      .png()
      .toFile(`public/og/${slug}.png`);

    console.log(
      `wrote public/og/${slug}.png (${CANVAS_WIDTH}x${CANVAS_HEIGHT}), mode poster, field ${field}, figure ${figureMeta.width}x${figureMeta.height}, centerX ${POSTER_FIGURE_CENTER_X}, top ${top}`,
    );
    continue;
  }

  // Bone mount panel: the plate plus an even margin on all sides, matching
  // the band's specimen-plate treatment (see MOUNT_MARGIN note).
  const mountWidth = figureMeta.width + MOUNT_MARGIN * 2;
  const mountHeight = figureMeta.height + MOUNT_MARGIN * 2;
  const mountBuffer = await sharp({
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
    `wrote public/og/${slug}.png (${CANVAS_WIDTH}x${CANVAS_HEIGHT}), mode plate, field ${field}, figure ${figureMeta.width}x${figureMeta.height}, mount ${mountWidth}x${mountHeight}`,
  );
}
