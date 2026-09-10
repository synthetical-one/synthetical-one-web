import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { CHARACTER_COLOURS, FIELD_COLOURS } from '../src/lib/palette';

const DIR = 'src/content/characters';
const CORE_QUESTIONS: Record<string, string> = {
  gyro: 'How does it work?',
  valve: 'How can we build it?',
  hikmah: 'Is it right?',
  ledger: 'What do we actually know?',
  echo: 'Why does it matter?',
  roam: "What's out there?",
  prism: 'How else can we see it?',
  prompt: 'Why do we accept it?',
};

function frontmatter(slug: string): Record<string, string> {
  const raw = readFileSync(`${DIR}/${slug}.md`, 'utf8');
  const block = raw.split('---')[1];
  const out: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

describe('character content', () => {
  it('has exactly eight files', () => {
    expect(readdirSync(DIR).filter((f) => f.endsWith('.md'))).toHaveLength(8);
  });

  it.each(Object.keys(CHARACTER_COLOURS))('%s uses its canon colour', (slug) => {
    expect(frontmatter(slug).colourHex).toBe(CHARACTER_COLOURS[slug as keyof typeof CHARACTER_COLOURS]);
  });

  it.each(Object.entries(CORE_QUESTIONS))('%s carries the canon core question', (slug, question) => {
    expect(frontmatter(slug).coreQuestion).toBe(question);
  });

  it.each(Object.keys(CHARACTER_COLOURS))('%s withholds MBTI', (slug) => {
    expect(readFileSync(`${DIR}/${slug}.md`, 'utf8')).not.toMatch(/MBTI/i);
  });

  it.each(Object.keys(CHARACTER_COLOURS))('%s withholds canon_status', (slug) => {
    expect(readFileSync(`${DIR}/${slug}.md`, 'utf8')).not.toMatch(/canon_status/i);
  });

  it.each(Object.keys(CHARACTER_COLOURS))('%s withholds age_equivalent', (slug) => {
    expect(readFileSync(`${DIR}/${slug}.md`, 'utf8')).not.toMatch(/age_equivalent/i);
  });

  it('orders are 1..8 with no duplicates', () => {
    const orders = Object.keys(CHARACTER_COLOURS).map((s) => Number(frontmatter(s).order));
    expect([...new Set(orders)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

const POSTER = ['echo', 'prompt'];
const PLATE = ['gyro', 'valve', 'hikmah', 'ledger', 'roam', 'prism'];

describe('poster system fields', () => {
  it.each(POSTER)('%s is in poster mode', (slug) => {
    expect(frontmatter(slug).artMode).toBe('poster');
  });

  it.each(PLATE)('%s is in plate mode', (slug) => {
    expect(frontmatter(slug).artMode).toBe('plate');
  });

  it('poster characters use their sampled field, not their canon colour', () => {
    expect(frontmatter('echo').fieldHex).toBe('#0D888F');
    expect(frontmatter('prompt').fieldHex).toBe('#F3BB19');
    expect(frontmatter('echo').fieldHex).not.toBe(frontmatter('echo').colourHex);
  });

  it.each(PLATE)('%s falls back to its canon colour as field', (slug) => {
    expect(frontmatter(slug).fieldHex).toBe(frontmatter(slug).colourHex);
  });

  it.each(POSTER)('%s fieldHex matches FIELD_COLOURS constant', (slug) => {
    expect(frontmatter(slug).fieldHex).toBe(FIELD_COLOURS[slug as keyof typeof FIELD_COLOURS]);
  });
});
