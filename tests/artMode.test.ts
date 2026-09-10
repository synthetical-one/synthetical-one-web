import { describe, it, expect } from 'vitest';
import { artModeIssue } from '../src/lib/artMode';

/**
 * Unit coverage for the art-mode invariant enforced in
 * src/content.config.ts's `.refine()`. This is the headline-feature
 * safeguard (a poster character must ship a cutout and no duotone; a plate
 * character must ship a duotone and no cutout) — it previously had no
 * automated coverage at all, only a manual, destructive-then-reverted edit
 * to content files. Tested directly against the exported predicate rather
 * than by invoking Astro's content pipeline from a unit test.
 */
describe('artModeIssue', () => {
  it('accepts a valid poster character (cutout, no duotone)', () => {
    expect(artModeIssue({ name: 'Echo', artMode: 'poster', cutout: {} })).toBeNull();
  });

  it('accepts a valid plate character (duotone, no cutout)', () => {
    expect(artModeIssue({ name: 'Gyro', artMode: 'plate', duotone: {} })).toBeNull();
  });

  it('flags a poster character missing a cutout', () => {
    const issue = artModeIssue({ name: 'Gyro', artMode: 'poster', duotone: {} });
    expect(issue).not.toBeNull();
    expect(issue).toContain('Gyro');
    expect(issue).toContain('no cutout image');
  });

  it('flags a poster character with no art at all', () => {
    const issue = artModeIssue({ name: 'Gyro', artMode: 'poster' });
    expect(issue).not.toBeNull();
    expect(issue).toContain('no cutout image');
  });

  it('flags a plate character carrying a stray cutout', () => {
    const issue = artModeIssue({ name: 'Valve', artMode: 'plate', duotone: {}, cutout: {} });
    expect(issue).not.toBeNull();
    expect(issue).toContain('Valve');
    expect(issue).toContain('still has a cutout image');
  });

  it('flags a plate character missing a duotone', () => {
    const issue = artModeIssue({ name: 'Valve', artMode: 'plate' });
    expect(issue).not.toBeNull();
    expect(issue).toContain('no duotone image');
  });

  it('flags a poster character carrying a stray duotone', () => {
    const issue = artModeIssue({ name: 'Prompt', artMode: 'poster', cutout: {}, duotone: {} });
    expect(issue).not.toBeNull();
    expect(issue).toContain('still has a duotone image');
  });
});
