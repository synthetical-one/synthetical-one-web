import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('landing page', () => {
  const html = () => readFileSync('dist/index.html', 'utf8');

  it('links a favicon', () => {
    expect(html()).toContain('rel="icon"');
  });
  it('ships the favicon file in the build output', () => {
    expect(existsSync('dist/favicon.svg')).toBe(true);
  });

  it('links to the YouTube channel', () => {
    expect(html()).toContain('https://www.youtube.com/@synthetical-media');
  });
  it('carries the canonical tagline', () => {
    expect(html()).toContain('Different questions. Different perspectives.');
  });
  it('names all four formats', () => {
    const page = html();
    for (const f of ['Short-form', 'Panels', 'Interviews', 'Documentaries']) {
      expect(page).toContain(f);
    }
  });
  it('offers a contact route for partners', () => {
    expect(html()).toContain('mailto:');
  });
  it('has exactly one h1', () => {
    expect(html().match(/<h1[\s>]/g)).toHaveLength(1);
  });
});

describe('hero poster', () => {
  const html = () => readFileSync('dist/index.html', 'utf8');

  it('still has exactly one h1', () => {
    expect(html().match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it('carries a secondary route to the roster', () => {
    expect(html()).toContain('href="#the-eight"');
  });

  it('the roster section has that anchor', () => {
    expect(html()).toContain('id="the-eight"');
  });
});
