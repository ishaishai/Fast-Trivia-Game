import { useState } from 'react';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { LightState } from '@shared/types';
import { LIGHTS } from '@/theme/palette';

/** Where each light begins and ends across a run (0 = sunrise, 1 = midnight). */
export const SKY_STOPS = [0, 0.2, 0.3, 0.6, 0.7, 0.88, 1];
export const SKY_FIELD = ['firstlight', 'firstlight', 'zenith', 'zenith', 'bluehour', 'midnight', 'midnight'].map(
  (k) => LIGHTS[k as LightState].field,
);
export const SKY_DEEP = ['firstlight', 'firstlight', 'zenith', 'zenith', 'bluehour', 'midnight', 'midnight'].map(
  (k) => LIGHTS[k as LightState].deep,
);
export const SKY_SUN = ['firstlight', 'firstlight', 'zenith', 'zenith', 'bluehour', 'midnight', 'midnight'].map(
  (k) => LIGHTS[k as LightState].sun,
);

/** Text flips from dark ink to light ink in one step, right where the sky turns blue. */
export const INK_FLIP = 0.25;

export function lightAtProgress(p: number): LightState {
  if (p < INK_FLIP) return 'firstlight';
  if (p < 0.65) return 'zenith';
  if (p < 0.85) return 'bluehour';
  return 'midnight';
}

/** The light the run is in right now, at a coarse grain (re-renders four times a run). */
export function useRunLight(day: SharedValue<number>): LightState {
  const [light, setLight] = useState<LightState>('firstlight');
  useAnimatedReaction(
    () => {
      const p = day.value;
      if (p < INK_FLIP) return 0;
      if (p < 0.65) return 1;
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
