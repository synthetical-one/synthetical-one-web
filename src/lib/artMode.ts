/**
 * The art-mode invariant (spec §poster system): a `poster` character must
 * supply a `cutout` and must not carry a `duotone`; a `plate` character must
 * supply a `duotone` and must not carry a `cutout`. A poster/plate promotion
 * should mean supplying the matching art, not just flipping `artMode` —
 * without this check, a poster character missing a cutout would silently
 * fall back to the plate branch in `CharacterBand.astro` instead of failing
 * the build.
 *
 * Extracted out of `content.config.ts`'s `.refine()` so the predicate has a
 * unit-testable surface independent of Astro's content pipeline (which a
 * plain vitest run can't invoke).
 */
export interface ArtModeCandidate {
  name: string;
  artMode: 'poster' | 'plate';
  cutout?: unknown;
  duotone?: unknown;
}

/**
 * Returns a human-readable description of what's wrong with `data`'s
 * art-mode/art-asset pairing, or `null` when it's valid.
 */
export function artModeIssue(data: ArtModeCandidate): string | null {
  if (data.artMode === 'poster') {
    if (data.cutout && !data.duotone) return null;
    return `${data.name} is artMode "poster" but ${
      !data.cutout ? 'has no cutout image' : 'still has a duotone image'
    }. Poster characters need a cutout and must not have a duotone.`;
  }
  if (data.duotone && !data.cutout) return null;
  return `${data.name} is artMode "plate" but ${
    !data.duotone ? 'has no duotone image' : 'still has a cutout image'
  }. Plate characters need a duotone and must not have a cutout.`;
}
