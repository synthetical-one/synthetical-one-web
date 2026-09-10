import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * <header> and <footer> expose the `banner` / `contentinfo` landmark roles
 * only when they are NOT descendants of <main> (HTML-AAM). Wrapping the whole
 * page in <main>, as an earlier layout did, therefore left every page with a
 * single landmark and no way to jump to the masthead or the footer. These
 * tests assert the elements are siblings of <main> in the built HTML.
 */

const PAGES_WITH_HEADER = ['dist/index.html', 'dist/characters/echo/index.html'];
const ALL_PAGES = [...PAGES_WITH_HEADER, 'dist/404.html'];

function mainRange(html: string): [number, number] {
  const start = html.indexOf('<main');
  const end = html.indexOf('</main>');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return [start, end];
}

function offsetsOf(html: string, tag: string): number[] {
  return [...html.matchAll(new RegExp(`<${tag}[\\s>]`, 'g'))].map((m) => m.index!);
}

describe('landmark structure', () => {
  it.each(ALL_PAGES)('%s has exactly one <main>', (page) => {
    const html = readFileSync(page, 'utf8');
    expect(html.match(/<main[\s>]/g)).toHaveLength(1);
  });

  it.each(PAGES_WITH_HEADER)('%s renders a <header> before <main>', (page) => {
    const html = readFileSync(page, 'utf8');
    const [start] = mainRange(html);
    const headers = offsetsOf(html, 'header');
    expect(headers.length).toBeGreaterThan(0);
    for (const at of headers) expect(at).toBeLessThan(start);
  });

  it.each(ALL_PAGES)('%s renders its <footer> after </main>', (page) => {
    const html = readFileSync(page, 'utf8');
    const [, end] = mainRange(html);
    const footers = offsetsOf(html, 'footer');
    expect(footers.length).toBeGreaterThan(0);
    for (const at of footers) expect(at).toBeGreaterThan(end);
  });

  it.each(ALL_PAGES)('%s puts no <header> or <footer> inside <main>', (page) => {
    const html = readFileSync(page, 'utf8');
    const [start, end] = mainRange(html);
    const inside = html.slice(start, end);
    expect(inside).not.toMatch(/<header[\s>]/);
    expect(inside).not.toMatch(/<footer[\s>]/);
  });

  it.each(ALL_PAGES)('%s keeps the skip link pointed at #main', (page) => {
    const html = readFileSync(page, 'utf8');
    expect(html).toContain('href="#main"');
    expect(html).toMatch(/<main[^>]*id="main"/);
  });

  it.each(ALL_PAGES)('%s labels every <nav> so they are distinguishable', (page) => {
    const html = readFileSync(page, 'utf8');
    const navs = [...html.matchAll(/<nav[^>]*>/g)].map((m) => m[0]);
    expect(navs.length).toBeGreaterThan(0);
    for (const nav of navs) expect(nav).toMatch(/aria-label="[^"]+"/);
  });
});

describe('404 head', () => {
  const html = () => readFileSync('dist/404.html', 'utf8');

  it('canonicalises to the site root, not its own non-resolving URL', () => {
    // Astro emits dist/404.html, not dist/404/index.html, so /404/ 404s.
    expect(html()).toContain('<link rel="canonical" href="https://synthetical.one/">');
    expect(html()).not.toContain('href="https://synthetical.one/404');
  });

  it('asks search engines not to index it', () => {
    expect(html()).toMatch(/<meta name="robots" content="noindex"\s*\/?>/);
  });
});
