import { useState } from 'react';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { LightState } from '@shared/types';
import { LIGHTS } from '@/theme/palette';

/** Where each light begins and ends across a run (0 = sunrise, 1 = midnight). */
export const SKY_STOPS = [0, 0.2, 0.3, 0.6, 0.7, 0.88, 1];
const STOP_LIGHTS: LightState[] = ['firstlight', 'firstlight', 'zenith', 'zenith', 'bluehour', 'midnight', 'midnight'];
export const SKY_SUN = STOP_LIGHTS.map((k) => LIGHTS[k].sun);

/**
 * The run's sky is the four worlds' gradients stacked: morning underneath,
 * each later one fading in over it across its stretch of the run.
 */
export const SKY_LAYERS: { light: LightState; from: number; to: number }[] = [
  { light: 'zenith', from: 0.2, to: 0.3 },
  { light: 'bluehour', from: 0.6, to: 0.7 },
  { light: 'midnight', from: 0.7, to: 0.88 },
];

/** The status bar turns light where the sky turns dark. */
export const INK_FLIP = 0.65;

export function lightAtProgress(p: number): LightState {
  if (p < 0.25) return 'firstlight';
  if (p < INK_FLIP) return 'zenith';
  if (p < 0.85) return 'bluehour';
  return 'midnight';
}

/** The light the run is in right now, at a coarse grain (re-renders four times a run). */
export function useRunLight(day: SharedValue<number>): LightState {
  const [light, setLight] = useState<LightState>('firstlight');
  useAnimatedReaction(
    () => {
      const p = day.value;
      if (p < 0.25) return 0;
      if (p < INK_FLIP) return 1;
      if (p < 0.85) return 2;
      return 3;
    },
    (band, prev) => {
      if (band !== prev) {
        const name = (['firstlight', 'zenith', 'bluehour', 'midnight'] as LightState[])[band];
        scheduleOnRN(setLight, name);
      }
    },
  );
  return light;
}
