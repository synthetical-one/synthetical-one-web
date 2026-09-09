import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('supporting routes', () => {
  it('has a 404 page', () => {
    expect(existsSync('dist/404.html')).toBe(true);
  });
  it('has robots.txt pointing at the sitemap', () => {
    expect(readFileSync('dist/robots.txt', 'utf8')).toContain('https://synthetical.one/sitemap-index.xml');
  });
  it('emits a sitemap', () => {
    expect(existsSync('dist/sitemap-index.xml')).toBe(true);
  });
});
