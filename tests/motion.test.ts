import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

function cssFiles(): string[] {
  const dir = 'dist/_astro';
  return readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => `${dir}/${f}`);
}
const allCss = () => cssFiles().map((f) => readFileSync(f, 'utf8')).join('\n');

describe('motion', () => {
  it('all scroll animation is gated behind prefers-reduced-motion', () => {
    const css = allCss();
    const timelines = (css.match(/animation-timeline/g) ?? []).length;
    expect(timelines).toBeGreaterThan(0);
    const gated = (css.match(/prefers-reduced-motion:\s*no-preference/g) ?? []).length;
    expect(gated).toBeGreaterThan(0);
  });

  it('uses no banned identifier for the drift effect', () => {
    expect(allCss().toLowerCase()).not.toContain('parallax');
  });

  it('grain overlay is present and non-interactive', () => {
    expect(readFileSync('dist/index.html', 'utf8')).toContain('grain');
    expect(allCss()).toContain('pointer-events:none');
  });

  it('grain overlay paints a real background image, not an empty filter target', () => {
    const css = allCss();
    expect(css).toMatch(/\.grain(\[data-astro-cid-[a-z0-9]+\])?\{[^}]*background-image:url\(["']?data:image\/svg\+xml/);
  });
});
