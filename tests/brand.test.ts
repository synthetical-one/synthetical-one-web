import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const FORBIDDEN = ['syntheticast', 'parallax'];

function filesUnder(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...filesUnder(path, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(path);
  }
  return out;
}

describe('former company names never ship', () => {
  const files = filesUnder('dist', ['.html', '.css']);

  it('found built files to scan', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(FORBIDDEN)('no built file contains %s', (needle) => {
    const offenders = files.filter((f) =>
      readFileSync(f, 'utf8').toLowerCase().includes(needle),
    );
    expect(offenders).toEqual([]);
  });
});
