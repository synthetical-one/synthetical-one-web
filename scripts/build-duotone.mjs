import sharp from 'sharp';
import { mkdirSync, readFileSync } from 'node:fs';

// The six characters with only production reference sheets (no cut-out art).
// Echo and Prompt get the full poster treatment instead, so they are
// deliberately excluded here -- this list is a real decision about which
// characters are in plate mode, not duplicated data.
const PLATE_SLUGS = ['gyro', 'valve', 'hikmah', 'ledger', 'roam', 'prism'];

const BONE = [237, 233, 221];

// Read each character's canon colour straight from its frontmatter, same
// approach as build-og.mjs's readColourHex -- so this can never drift from
// CHARACTER_COLOURS in src/lib/palette.ts or the content itself.
function readColourHex(slug) {
  const raw = readFileSync(`src/content/characters/${slug}.md`, 'utf8');
  const match = raw.match(/^colourHex:\s*"?(#[0-9A-Fa-f]{6})"?/m);
  if (!match) throw new Error(`no colourHex frontmatter found for ${slug}`);
  return match[1];
}

function rgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

/** Build a 256-entry ramp: 0 -> shadow, 128 -> field, 255 -> bone. */
function ramp(field) {
  const shadow = field.map((v) => Math.round(v * 0.3));
  const table = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const [from, to, k] = t < 0.5 ? [shadow, field, t * 2] : [field, BONE, (t - 0.5) * 2];
    table.push(from.map((f, c) => Math.round(f + (to[c] - f) * k)));
  }
  return table;
}

mkdirSync('src/assets/duotone', { recursive: true });

for (const slug of PLATE_SLUGS) {
  const hex = readColourHex(slug);
  const field = rgb(hex);
  const table = ramp(field);
  const src = sharp(`src/assets/characters/${slug}.png`).greyscale().linear(1.15, -16);
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) {
    const [r, g, b] = table[data[i * info.channels]];
    out[i * 3] = r;
    out[i * 3 + 1] = g;
    out[i * 3 + 2] = b;
  }
  const file = `src/assets/duotone/${slug}.png`;
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png()
    .toFile(file);
  console.log(`${slug}: ${info.width}x${info.height}, field ${hex} -> ${file}`);
}
