import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const POSTER_SLUGS = ['echo', 'prompt'];

describe('character cut-outs', () => {
  it.each(POSTER_SLUGS)('%s cut-out exists', (slug) => {
    expect(existsSync(`src/assets/cutouts/${slug}.png`)).toBe(true);
  });

  it.each(POSTER_SLUGS)('%s cut-out has an alpha channel', async (slug) => {
    const meta = await sharp(`src/assets/cutouts/${slug}.png`).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it.each(POSTER_SLUGS)('%s cut-out is trimmed to its subject', async (slug) => {
    const meta = await sharp(`src/assets/cutouts/${slug}.png`).metadata();
    expect(meta.width).toBeLessThan(1024);
  });
});
