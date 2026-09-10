import sharp from 'sharp';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

// Source paths live outside the repo, in a private media library, and are read
// from a gitignored local manifest rather than hardcoded here: this repository
// is public, and absolute source paths disclose the owner's home directory,
// their media library's layout, and asset UUIDs from a private upstream repo —
// the same class of disclosure the design documents were removed from this
// repo to prevent.
//
// Shape: { "echo": "/absolute/path/echo.png", "prompt": "/absolute/path/prompt.png" }
const MANIFEST = 'scripts/cutout-sources.local.json';

if (!existsSync(MANIFEST)) {
  console.error(
    `Missing ${MANIFEST}.\n\n` +
      'This script imports cut-outs from a private media library outside the\n' +
      'repo, so the source paths are deliberately not committed. Create the\n' +
      'file with a JSON object mapping each poster-mode slug to the absolute\n' +
      'path of its source PNG:\n\n' +
      '  {\n' +
      '    "echo": "/absolute/path/to/echo.png",\n' +
      '    "prompt": "/absolute/path/to/prompt.png"\n' +
      '  }\n',
  );
  process.exit(1);
}

const SOURCES = JSON.parse(readFileSync(MANIFEST, 'utf8'));

mkdirSync('src/assets/cutouts', { recursive: true });

for (const [slug, src] of Object.entries(SOURCES)) {
  if (!existsSync(src)) {
    console.error(`${MANIFEST} points "${slug}" at a file that does not exist: ${src}`);
    process.exit(1);
  }
  const out = `src/assets/cutouts/${slug}.png`;
  // trim() removes fully-transparent margin so the figure sits flush in its box,
  // which lets CSS position it against the diagonal without per-image nudging.
  const info = await sharp(src).trim().png().toFile(out);
  console.log(`${slug}: ${info.width}x${info.height} -> ${out}`);
}
