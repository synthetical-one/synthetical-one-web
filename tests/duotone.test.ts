import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const PLATE_SLUGS = ['gyro', 'valve', 'hikmah', 'ledger', 'roam', 'prism'];
const BONE = [237, 233, 221];

function readColourHex(slug: string): string {
  const raw = readFileSync(`src/content/characters/${slug}.md`, 'utf8');
  const match = raw.match(/^colourHex:\s*"?(#[0-9A-Fa-f]{6})"?/m);
  if (!match) throw new Error(`no colourHex frontmatter found for ${slug}`);
  return match[1];
}

function rgb(hex: string): number[] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

async function pixels(path: string) {
  const { data, info } = await sharp(path).raw().toBuffer({ resolveWithObject: true });
  const out: number[][] = [];
  for (let i = 0; i < info.width * info.height; i++) {
    out.push([data[i * info.channels], data[i * info.channels + 1], data[i * info.channels + 2]]);
  }
  return out;
}

describe('duotone plates', () => {
  it.each(PLATE_SLUGS)('%s duotone exists', (slug) => {
    expect(existsSync(`src/assets/duotone/${slug}.png`)).toBe(true);
  });

  it.each(PLATE_SLUGS)('%s duotone matches its source portrait dimensions', async (slug) => {
    const a = await sharp(`src/assets/characters/${slug}.png`).metadata();
    const b = await sharp(`src/assets/duotone/${slug}.png`).metadata();
    expect([b.width, b.height]).toEqual([a.width, a.height]);
  });

  it('echo and prompt have no duotone — they use cut-outs', () => {
    expect(existsSync('src/assets/duotone/echo.png')).toBe(false);
    expect(existsSync('src/assets/duotone/prompt.png')).toBe(false);
  });

  it.each(PLATE_SLUGS)(
    '%s duotone reaches all three ramp stops: deepened shadow, field, and bone',
    async (slug) => {
      const hex = readColourHex(slug);
      const field = rgb(hex);
      const shadow = field.map((v) => Math.round(v * 0.3));
      const dist = (a: number[], b: number[]) =>
        Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));

      const px = await pixels(`src/assets/duotone/${slug}.png`);

      // Highlights should land at or very near bone (grey level 255 maps
      // exactly to BONE in the ramp table).
      const nearBone = px.some((p) => dist(p, BONE) < 6);
      expect(nearBone).toBe(true);

      // Midtones should land at or very near the character's field colour
      // (grey level 128 maps exactly to `field` in the ramp table).
      const nearField = px.some((p) => dist(p, field) < 6);
      expect(nearField).toBe(true);

      // Shadows must be genuinely deepened -- distinct from and darker than
      // the field colour itself, not just "the field again". This is what a
      // collapsed 2-stop (shadow-to-bone-only) or a linear tint would fail:
      // without the field held at the midpoint, shadow pixels would instead
      // cluster near an interpolation between shadow and bone, never this
      // close to the true 30%-of-field value.
      const nearShadow = px.some((p) => dist(p, shadow) < 6);
      expect(nearShadow).toBe(true);
    },
  );

  it.each(PLATE_SLUGS)(
    "%s duotone is not a greyscale copy of its source (channels aren't all equal)",
    async (slug) => {
      const { data, info } = await sharp(`src/assets/duotone/${slug}.png`)
        .raw()
        .toBuffer({ resolveWithObject: true });
      let hasTintedPixel = false;
      for (let i = 0; i < info.width * info.height; i++) {
        const r = data[i * info.channels];
        const g = data[i * info.channels + 1];
        const b = data[i * info.channels + 2];
        if (r !== g || g !== b) {
          hasTintedPixel = true;
          break;
        }
      }
      expect(hasTintedPixel).toBe(true);
    },
  );
});
