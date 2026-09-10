import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SOURCES = {
  echo: '<private-media-path-redacted>',
  prompt: '<private-media-path-redacted>',
};

mkdirSync('src/assets/cutouts', { recursive: true });

for (const [slug, src] of Object.entries(SOURCES)) {
  const out = `src/assets/cutouts/${slug}.png`;
  // trim() removes fully-transparent margin so the figure sits flush in its box,
  // which lets CSS position it against the diagonal without per-image nudging.
  const info = await sharp(src).trim().png().toFile(out);
  console.log(`${slug}: ${info.width}x${info.height} -> ${out}`);
}
