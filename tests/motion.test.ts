import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

function cssFiles(): string[] {
  const dir = 'dist/_astro';
  return readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => `${dir}/${f}`);
}
const allCss = () => cssFiles().map((f) => readFileSync(f, 'utf8')).join('\n');

// Brace-matches every `@media (... prefers-reduced-motion: no-preference ...) { ... }`
// block out of (possibly minified) CSS, returning each block's full contents
// (braces included) so occurrences of a rule *inside* the gate can be counted
// separately from occurrences anywhere in the bundle.
function extractReducedMotionGateBlocks(css: string): string[] {
  const opener = /@media[^{]*prefers-reduced-motion:\s*no-preference[^{]*\{/g;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = opener.exec(css))) {
    const braceStart = match.index + match[0].length - 1;
    let depth = 1;
    let i = braceStart + 1;
    while (depth > 0 && i < css.length) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') depth--;
      i++;
    }
    blocks.push(css.slice(braceStart, i));
  }
  return blocks;
}

describe('motion', () => {
  it('every animation-timeline occurrence is nested inside the prefers-reduced-motion gate', () => {
    const css = allCss();
    const totalTimelines = (css.match(/animation-timeline/g) ?? []).length;
    expect(totalTimelines).toBeGreaterThan(0);

    const gatedCss = extractReducedMotionGateBlocks(css).join('\n');
    const gatedTimelines = (gatedCss.match(/animation-timeline/g) ?? []).length;

    // Containment, not co-occurrence: every animation-timeline in the whole
    // bundle must appear inside a gated block, not merely alongside one.
    expect(gatedTimelines).toBe(totalTimelines);
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
