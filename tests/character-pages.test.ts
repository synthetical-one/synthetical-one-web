import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const SLUGS = ['gyro', 'valve', 'hikmah', 'ledger', 'echo', 'roam', 'prism', 'prompt'];

describe('character pages', () => {
  it.each(SLUGS)('/characters/%s/ exists', (slug) => {
    expect(existsSync(`dist/characters/${slug}/index.html`)).toBe(true);
  });

  it.each(SLUGS)('%s page has a unique title', (slug) => {
    const html = readFileSync(`dist/characters/${slug}/index.html`, 'utf8');
    expect(html).toMatch(new RegExp(`<title>[^<]*${slug}`, 'i'));
  });

  it.each(SLUGS)('%s page links onward to another character', (slug) => {
    const html = readFileSync(`dist/characters/${slug}/index.html`, 'utf8');
    const links = [...html.matchAll(/href="\/characters\/([a-z]+)\//g)].map((m) => m[1]);
    expect(links.filter((l) => l !== slug).length).toBeGreaterThanOrEqual(2);
  });

  it.each(SLUGS)('%s page carries a subscribe CTA', (slug) => {
    const html = readFileSync(`dist/characters/${slug}/index.html`, 'utf8');
    expect(html).toContain('https://www.youtube.com/@synthetical-media');
  });

  it('prev/next cycles the whole roster', () => {
    const seen = new Set<string>();
    for (const slug of SLUGS) {
      const html = readFileSync(`dist/characters/${slug}/index.html`, 'utf8');
      for (const m of html.matchAll(/href="\/characters\/([a-z]+)\//g)) seen.add(m[1]);
    }
    for (const slug of SLUGS) expect(seen.has(slug)).toBe(true);
  });

  it.each(SLUGS)('%s page links home to the roster', (slug) => {
    const html = readFileSync(`dist/characters/${slug}/index.html`, 'utf8');
    expect(html).toMatch(/href="\/"/);
  });

  it.each(SLUGS)('%s page has a dedicated OG image', (slug) => {
    const html = readFileSync(`dist/characters/${slug}/index.html`, 'utf8');
    expect(html).toMatch(new RegExp(`<meta property="og:image" content="[^"]*/og/${slug}\\.png"`));
  });

  it.each(SLUGS)('%s page does not link to its own profile', (slug) => {
    const html = readFileSync(`dist/characters/${slug}/index.html`, 'utf8');
    expect(html).not.toContain(`href="/characters/${slug}/"`);
  });
});

describe('landing page profile links', () => {
  it('links to all eight character profiles', () => {
    const html = readFileSync('dist/index.html', 'utf8');
    for (const slug of SLUGS) {
      expect(html).toContain(`href="/characters/${slug}/"`);
    }
  });
});

describe('character OG cards', () => {
  it.each(SLUGS)('dist/og/%s.png exists', (slug) => {
    expect(existsSync(`dist/og/${slug}.png`)).toBe(true);
  });
});
