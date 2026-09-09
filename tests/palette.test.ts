import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { GROUND, CHARACTER_COLOURS, contrastRatio, bestOn } from '../src/lib/palette';

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('#8C2F39', '#8C2F39')).toBeCloseTo(1, 5);
  });
});

describe('ground pairings', () => {
  it('ink on bone clears AAA', () => {
    expect(contrastRatio(GROUND.ink, GROUND.bone)).toBeGreaterThanOrEqual(7);
  });
  it('ink-soft on bone clears AA body', () => {
    expect(contrastRatio(GROUND.inkSoft, GROUND.bone)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('forbidden on bone', () => {
  it.each([['#8A909E'], ['#3FE08A']])('%s fails on bone and must not be used there', (hex) => {
    expect(contrastRatio(hex, GROUND.bone)).toBeLessThan(3);
  });
});

describe('character colours', () => {
  it('has exactly eight', () => {
    expect(Object.keys(CHARACTER_COLOURS)).toHaveLength(8);
  });
  it.each(Object.entries(CHARACTER_COLOURS))(
    '%s clears 3:1 on bone for large display type',
    (_slug, hex) => {
      expect(contrastRatio(hex, GROUND.bone)).toBeGreaterThanOrEqual(3);
    },
  );
  // Character colours are display-scale only (design spec §4): AA large text
  // is 3:1. Several canon colours measure 4.0–4.3 against bone, which clears
  // large but not body — no character colour ever carries body copy.
  it.each(Object.entries(CHARACTER_COLOURS))(
    '%s has a legible type colour on its own field at display scale',
    (_slug, hex) => {
      expect(contrastRatio(bestOn(hex), hex)).toBeGreaterThanOrEqual(3);
    },
  );
});

describe('tokens.css matches palette.ts', () => {
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  const readVar = (name: string) => {
    const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
    return m ? m[1].toUpperCase() : null;
  };
  it.each([
    ['bone', GROUND.bone],
    ['bone-sunk', GROUND.boneSunk],
    ['ink', GROUND.ink],
    ['ink-soft', GROUND.inkSoft],
  ])('--%s equals the palette value', (name, expected) => {
    expect(readVar(name)).toBe(expected.toUpperCase());
  });
});
