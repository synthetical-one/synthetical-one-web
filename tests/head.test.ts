import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('index head', () => {
  const html = () => readFileSync('dist/index.html', 'utf8');

  it('declares the language', () => {
    expect(html()).toContain('<html lang="en"');
  });
  it('has a meta description', () => {
    expect(html()).toMatch(/<meta name="description" content="[^"]{20,}"/);
  });
  it('has an Open Graph title', () => {
    expect(html()).toMatch(/<meta property="og:title" content="[^"]+"/);
  });
  it('has an absolute canonical URL', () => {
    expect(html()).toContain('https://synthetical.one');
  });
  it('has a skip link', () => {
    expect(html()).toContain('href="#main"');
  });
});
