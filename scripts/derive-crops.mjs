import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';

const boxes = JSON.parse(readFileSync('scripts/crops.json', 'utf8'));
mkdirSync('src/assets/characters', { recursive: true });

const tiles = [];
for (const [slug, [left, top, right, bottom]] of Object.entries(boxes)) {
  const width = right - left;
  const height = bottom - top;
  const out = `src/assets/characters/${slug}.png`;
  await sharp(`src/assets/reference-sheets/${slug}.png`)
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
