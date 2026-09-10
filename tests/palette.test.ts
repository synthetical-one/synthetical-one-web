import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  GROUND,
  CHARACTER_COLOURS,
  FIELD_COLOURS,
  contrastRatio,
  bestOn,
  displayOn,
} from '../src/lib/palette';

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

describe('poster field colours', () => {
  it('has a field for echo and prompt', () => {
    expect(FIELD_COLOURS.echo).toBe('#0D888F');
    expect(FIELD_COLOURS.prompt).toBe('#F3BB19');
  });

  it.each(Object.entries(FIELD_COLOURS))(
    '%s field carries display type at 3:1 or better',
    (_slug, hex) => {
      expect(contrastRatio(bestOn(hex as string), hex as string)).toBeGreaterThanOrEqual(3);
    },
  );

  it('bone is unusable on the yellow field, so small text must not go there', () => {
    expect(contrastRatio(GROUND.bone, '#F3BB19')).toBeLessThan(3);
  });
});

describe('displayOn', () => {
  // The eight fields a character's display type (name, core question) can
  // land on: each character's poster field where one exists, else their
  // canon colour. Prompt's yellow is the sole case where bone fails 3:1.
  const ALL_FIELDS: Record<string, string> = {
    ...CHARACTER_COLOURS,
    ...FIELD_COLOURS,
  };

  it.each(Object.entries(ALL_FIELDS))(
    '%s: prefers bone, falling back to ink only where bone fails 3:1',
    (slug, hex) => {
      if (hex === '#F3BB19') {
        expect(displayOn(hex)).toBe(GROUND.ink);
      } else {
        expect(displayOn(hex)).toBe(GROUND.bone);
      }
    },
  );

  it("returns ink for Prompt's yellow", () => {
    expect(displayOn('#F3BB19')).toBe(GROUND.ink);
  });

  it.each(Object.entries(ALL_FIELDS))(
    '%s: the returned colour clears 3:1 against the field',
    (_slug, hex) => {
      expect(contrastRatio(displayOn(hex), hex)).toBeGreaterThanOrEqual(3);
    },
  );
});
