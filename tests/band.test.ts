import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('character bands on the landing page', () => {
  const html = () => readFileSync('dist/index.html', 'utf8');

  it('renders all eight catalogue numbers', () => {
    const page = html();
    for (const n of ['N°001', 'N°002', 'N°003', 'N°004', 'N°005', 'N°006', 'N°007', 'N°008']) {
      expect(page).toContain(n);
    }
  });

  it('renders every core question', () => {
    const page = html();
    for (const q of [
      'How does it work?', 'How can we build it?', 'Is it right?',
      'What do we actually know?', 'Why does it matter?', "What's out there?",
      'How else can we see it?', 'Why do we accept it?',
    ]) {
      expect(page).toContain(q);
    }
  });

  it('gives every portrait descriptive alt text', () => {
    const alts = [...html().matchAll(/<img[^>]*alt="([^"]*)"/g)].map((m) => m[1]);
    expect(alts.length).toBeGreaterThanOrEqual(8);
    for (const alt of alts) expect(alt.length).toBeGreaterThan(12);
  });

  it('gives every image explicit dimensions to prevent layout shift', () => {
    const imgs = [...html().matchAll(/<img[^>]*>/g)].map((m) => m[0]);
    for (const img of imgs) {
      expect(img).toMatch(/width="\d+"/);
      expect(img).toMatch(/height="\d+"/);
    }
  });
});
