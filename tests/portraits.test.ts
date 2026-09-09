import { describe, it, expect } from 'vitest';
import { existsSync, statSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { CHARACTER_COLOURS } from '../src/lib/palette';

const boxes: Record<string, [number, number, number, number]> = JSON.parse(
  readFileSync('scripts/crops.json', 'utf8'),
);

describe('character portraits', () => {
  it.each(Object.keys(CHARACTER_COLOURS))('%s portrait exists', (slug) => {
    expect(existsSync(`src/assets/characters/${slug}.png`)).toBe(true);
  });

  it.each(Object.keys(CHARACTER_COLOURS))('%s portrait is a plausible crop', (slug) => {
    expect(statSync(`src/assets/characters/${slug}.png`).size).toBeGreaterThan(10_000);
  });

  it.each(Object.keys(CHARACTER_COLOURS))(
    '%s portrait dimensions match its crops.json box',
    async (slug) => {
      const [left, top, right, bottom] = boxes[slug];
      const expectedWidth = right - left;
      const expectedHeight = bottom - top;
      const metadata = await sharp(`src/assets/characters/${slug}.png`).metadata();
      expect(metadata.width).toBe(expectedWidth);
      expect(metadata.height).toBe(expectedHeight);
    },
  );
});
