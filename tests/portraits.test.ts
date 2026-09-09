import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { CHARACTER_COLOURS } from '../src/lib/palette';

describe('character portraits', () => {
  it.each(Object.keys(CHARACTER_COLOURS))('%s portrait exists', (slug) => {
    expect(existsSync(`src/assets/characters/${slug}.png`)).toBe(true);
  });

  it.each(Object.keys(CHARACTER_COLOURS))('%s portrait is a plausible crop', (slug) => {
    expect(statSync(`src/assets/characters/${slug}.png`).size).toBeGreaterThan(10_000);
  });
});
