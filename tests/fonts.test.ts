import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

function allHtml(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...allHtml(path));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

describe('fonts are self-hosted', () => {
  const pages = allHtml('dist');

  it('built at least one page', () => {
    expect(pages.length).toBeGreaterThan(0);
  });

  it.each(['fonts.googleapis.com', 'fonts.gstatic.com', 'use.typekit.net'])(
    'no page references %s',
    (host) => {
      for (const page of pages) {
        expect(readFileSync(page, 'utf8')).not.toContain(host);
      }
    },
  );
});
