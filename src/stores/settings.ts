import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LightState } from '@shared/types';

export type MotionPref = 'system' | 'reduced' | 'full';

interface SettingsState {
  sound: boolean;
  haptics: boolean;
  motion: MotionPref;
  /** Practice only: six seconds a question instead of three. */
  relaxedPractice: boolean;
  /** Preview builds can pin a light state for review. */
  lightOverride: LightState | null;
  setSound: (on: boolean) => void;
  setHaptics: (on: boolean) => void;
  setMotion: (pref: MotionPref) => void;
  setRelaxedPractice: (on: boolean) => void;
  setLightOverride: (light: LightState | null) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      haptics: true,
      motion: 'system',
      relaxedPractice: false,
      lightOverride: null,
      setSound: (sound) => set({ sound }),
      setHaptics: (haptics) => set({ haptics }),
      setMotion: (motion) => set({ motion }),
      setRelaxedPractice: (relaxedPractice) => set({ relaxedPractice }),
      setLightOverride: (lightOverride) => set({ lightOverride }),
    }),
    {
      name: 'glint:settings:v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
