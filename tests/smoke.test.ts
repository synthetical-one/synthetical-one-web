import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('build output', () => {
  it('emits an index page', () => {
    expect(existsSync('dist/index.html')).toBe(true);
  });

  it('index page is not empty', () => {
    const html = readFileSync('dist/index.html', 'utf8');
    expect(html.length).toBeGreaterThan(100);
  });
});
