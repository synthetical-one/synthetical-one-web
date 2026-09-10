export type CharacterSlug =
  | 'gyro' | 'valve' | 'hikmah' | 'ledger'
  | 'echo' | 'roam' | 'prism' | 'prompt';

export const GROUND = {
  bone: '#EDE9DD',
  boneSunk: '#E3DECE',
  ink: '#14161B',
  inkSoft: '#5A6070',
} as const;

/** Canon colours, screen values. Names stay canon; these are legible on bone. */
export const CHARACTER_COLOURS: Record<CharacterSlug, string> = {
  gyro: '#0E7C4A',
  valve: '#B45309',
  hikmah: '#2563EB',
  ledger: '#8C2F39',
  echo: '#C2410C',
  roam: '#0369A1',
  prism: '#7C5FBF',
  prompt: '#6D28D9',
};

/**
 * Poster field colours — the stage a character stands on, chosen to contrast
 * them rather than match them. Distinct from CHARACTER_COLOURS, which holds
 * their frozen canon colour. Sampled from the owner's supplied posters.
 * Present only for characters with poster art.
 */
export const FIELD_COLOURS: Partial<Record<CharacterSlug, string>> = {
  echo: '#0D888F',
  prompt: '#F3BB19',
};

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Spec §4: type on a colour field is bone or ink, whichever measures higher. */
export function bestOn(field: string): string {
  return contrastRatio(GROUND.bone, field) >= contrastRatio(GROUND.ink, field)
    ? GROUND.bone
    : GROUND.ink;
}
