import { Easing, useReducedMotion } from 'react-native-reanimated';
import { useSettings } from '@/stores/settings';

export const ease = {
  /** entrances: quick start, long soft landing */
  out: Easing.bezier(0.16, 1, 0.3, 1),
  /** moves between two resting states */
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  /** exits */
  in: Easing.bezier(0.7, 0, 0.84, 0),
  linear: Easing.linear,
};

export const dur = {
  micro: 120,
  short: 220,
  base: 360,
  slow: 640,
  cinematic: 1100,
};

export const springs = {
  soft: { damping: 18, stiffness: 160, mass: 1 },
  snappy: { damping: 22, stiffness: 320, mass: 1 },
};

/** Full motion unless the system or the player asked for less. */
export function useMotionOK(): boolean {
  const systemReduced = useReducedMotion();
  const pref = useSettings((s) => s.motion);
  if (pref === 'full') return true;
  if (pref === 'reduced') return false;
  return !systemReduced;
}
