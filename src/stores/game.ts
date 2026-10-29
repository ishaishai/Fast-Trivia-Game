import { create } from 'zustand';
import type { Profile } from '@shared/types';
import type { DayView } from '@/backend/types';

interface GameState {
  ready: boolean;
  error: string | null;
  profile: Profile | null;
  day: DayView | null;
  setReady: (ready: boolean) => void;
  setError: (error: string | null) => void;
  setProfile: (profile: Profile | null) => void;
  setDay: (day: DayView) => void;
}

/** App-wide game data, fed by the BackendProvider. */
export const useGame = create<GameState>()((set) => ({
  ready: false,
  error: null,
  profile: null,
  day: null,
  setReady: (ready) => set({ ready }),
  setError: (error) => set({ error }),
  setProfile: (profile) => set({ profile }),
  setDay: (day) => set({ day }),
}));
