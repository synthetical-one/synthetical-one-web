import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Decode the small set of HTML entities Astro's default `{expr}` escaping
 * can introduce into rendered text, so assertions can compare against the
 * plain-text content a reader would actually see rather than its escaped
 * HTML form.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

describe('character bands on the landing page', () => {
  const html = () => decodeEntities(readFileSync('dist/index.html', 'utf8'));

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

describe('poster mode', () => {
  const html = () => decodeEntities(readFileSync('dist/index.html', 'utf8'));

  it('renders a diagonal field for poster-mode characters', () => {
    expect(html()).toMatch(/class="[^"]*band--poster/);
  });

  it('renders micro-copy words for echo', () => {
    const page = html();
    for (const word of ['LISTEN', 'THINK', 'EXPLORE', 'DISCUSS', 'REPEAT']) {
      expect(page).toContain(word);
    }
  });

  it('plate-mode characters do not get poster class', () => {
    const plates = (html().match(/band--plate/g) ?? []).length;
    expect(plates).toBe(6);
  });

  it('decorative furniture is hidden from assistive tech', () => {
    const furniture = html().match(/<svg[^>]*class="[^"]*furniture[^"]*"[^>]*>/g) ?? [];
    expect(furniture.length).toBeGreaterThan(0);
    for (const el of furniture) expect(el).toContain('aria-hidden="true"');
  });
});
