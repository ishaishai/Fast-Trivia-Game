import type { Light } from './palette';

export const radius = {
  s: 12,
  m: 18,
  l: 24,
  xl: 32,
  pill: 999,
};

/** How far a button's face sits above its lip, by button size. */
export const lip = {
  s: 4,
  m: 5,
  l: 6,
  xl: 8,
};

/**
 * A card's shadow: a hard tinted edge underneath (the "lip") plus a soft drop.
 * Only for a handful of large cards per screen; rows in long lists use `flatShadow`.
 */
export function cardShadow(light: Light, edge = 6): string {
  return `0px ${edge}px 0px 0px ${light.shadow}, 0px ${edge + 10}px 24px -10px ${light.shadow}`;
}

/** Just the hard edge: cheap enough for long lists. */
export function flatShadow(light: Light, edge = 4): string {
  return `0px ${edge}px 0px 0px ${light.shadow}`;
}
