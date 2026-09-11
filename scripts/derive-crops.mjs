import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';

// Source sheet paths live outside the repo, in a private media library, and are
// read from a gitignored local manifest rather than hardcoded here: this
// repository is public, and absolute source paths disclose the owner's home
// directory, their media library's layout, and asset UUIDs from a private
// upstream repo — the same class of disclosure the design documents were
// removed from this repo to prevent.
//
// Crop boxes remain committed (scripts/crops.json) because they are the
// valuable reproducible part — the derivation is deterministic given the source
// sheets and the boxes.
//
// Shape: { "gyro": "/absolute/path/to/gyro.png", "valve": "/absolute/path/to/valve.png" }
const MANIFEST = 'scripts/crop-sources.local.json';

if (!existsSync(MANIFEST)) {
  console.error(
    `Missing ${MANIFEST}.\n\n` +
      'This script derives character crops from reference sheets in a private\n' +
      'media library outside the repo, so the source paths are deliberately not\n' +
      'committed. Create the file with a JSON object mapping each character slug\n' +
      'to the absolute path of its reference sheet PNG:\n\n' +
      '  {\n' +
      '    "gyro": "/absolute/path/to/gyro.png",\n' +
      '    "valve": "/absolute/path/to/valve.png",\n' +
      '    "hikmah": "/absolute/path/to/hikmah.png",\n' +
      '    "ledger": "/absolute/path/to/ledger.png",\n' +
      '    "echo": "/absolute/path/to/echo.png",\n' +
      '    "roam": "/absolute/path/to/roam.png",\n' +
      '    "prism": "/absolute/path/to/prism.png",\n' +
      '    "prompt": "/absolute/path/to/prompt.png"\n' +
      '  }\n',
  );
  process.exit(1);
}

const SOURCES = JSON.parse(readFileSync(MANIFEST, 'utf8'));

for (const [slug, src] of Object.entries(SOURCES)) {
  if (!existsSync(src)) {
    console.error(`${MANIFEST} points "${slug}" at a file that does not exist: ${src}`);
    process.exit(1);
  }
}

const boxes = JSON.parse(readFileSync('scripts/crops.json', 'utf8'));
mkdirSync('src/assets/characters', { recursive: true });

const tiles = [];
for (const [slug, [left, top, right, bottom]] of Object.entries(boxes)) {
  const width = right - left;
  const height = bottom - top;
  const out = `src/assets/characters/${slug}.png`;
  await sharp(SOURCES[slug])
    .extract({ left, top, width, height })
    .toFile(out);
  console.log(`${slug}: ${width}x${height} -> ${out}`);
  tiles.push({ slug, out, width, height });
}

// Contact sheet for visual verification.
const H = Math.max(...tiles.map((t) => t.height));
const W = Math.max(...tiles.map((t) => t.width));
await sharp({
  create: { width: W * 4, height: H * 2, channels: 3, background: '#ffffff' },
})
  .composite(
    await Promise.all(
      tiles.map(async (t, i) => ({
        input: await sharp(t.out).toBuffer(),
        left: (i % 4) * W,
        top: Math.floor(i / 4) * H + (H - t.height),
      })),
    ),
  )
  .toFile('scripts/contact-sheet.png');
console.log('wrote scripts/contact-sheet.png');
