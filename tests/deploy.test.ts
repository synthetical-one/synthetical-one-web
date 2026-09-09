import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

describe('Pages deployment artefacts', () => {
  it('ships .nojekyll so _astro/ survives', () => {
    expect(existsSync('dist/.nojekyll')).toBe(true);
  });
  it('ships CNAME with the apex domain', () => {
    expect(readFileSync('dist/CNAME', 'utf8').trim()).toBe('synthetical.one');
  });
  it('has a deploy workflow', () => {
    expect(existsSync('.github/workflows/deploy.yml')).toBe(true);
  });
});
