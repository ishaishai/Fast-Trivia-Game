import { Easing, useReducedMotion } from 'react-native-reanimated';
import { useSettings } from '@/stores/settings';

export const ease = {
  /** entrances: quick start, long soft landing */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** moves between two resting states */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** exits */
  in: Easing.bezier(0.7, 0, 0.84, 0),
  /** a little past the mark and back: things that land */
  back: Easing.bezier(0.34, 1.56, 0.64, 1),
  linear: Easing.linear,
};

export const dur = {
  micro: 120,
  short: 220,
  base: 360,
  slow: 640,
  cinematic: 1100,
};

/**
 * Physical springs (damping / stiffness / mass), so their length doesn't
 * depend on Reanimated's perceptual-duration defaults. Anything inside the
 * run's feedback window uses timings from src/run/windows.ts instead.
 */
export const springs = {
  soft: { damping: 18, stiffness: 160, mass: 1 },
  snappy: { damping: 22, stiffness: 320, mass: 1 },
  /** pop-ins: one clear overshoot, settles in ~450 ms */
  pop: { damping: 12, stiffness: 260, mass: 0.8 },
  /** big, happy landings: podiums, crowns, the play button */
  bouncy: { damping: 9, stiffness: 180, mass: 0.9 },
  /** a finger pressing a button down: fast, no bounce */
  press: { damping: 30, stiffness: 900, mass: 0.6 },
  /** letting go: the button jumps back up past its rest */
  release: { damping: 10, stiffness: 420, mass: 0.7 },
  /** a quick wobble that rings a few times */
  wobble: { damping: 6, stiffness: 300, mass: 0.6 },
};

/** Periods of the ambient loops, in ms. */
export const loops = {
  bob: 2600,
  pulse: 1400,
  twinkle: 2200,
  drift: 24000,
};

/** Gaps between items that arrive one after another, in ms. */
export const stagger = {
  list: 60,
  words: 55,
};

/** Caps that keep particles cheap. */
export const fx = {
  maxBurst: 10,
  maxConfetti: 36,
};

/** Full motion unless the system or the player asked for less. */
export function useMotionOK(): boolean {
  const systemReduced = useReducedMotion();
  const pref = useSettings((s) => s.motion);
  if (pref === 'full') return true;
  if (pref === 'reduced') return false;
  return !systemReduced;
}
