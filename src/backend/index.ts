import { FirebaseBackend } from '@/backend/firebase';
import { MockBackend } from '@/backend/mock';
import type { GameBackend } from './types';

export type { DayView, GameBackend, LeaderboardView, PlayedSummary, PreviewControls, WireEvent } from './types';

/** Chosen at build time. Defaults to the offline mock so the game runs with no setup. */
export const BACKEND_KIND: 'mock' | 'firebase' = process.env.EXPO_PUBLIC_BACKEND === 'firebase' ? 'firebase' : 'mock';

export function createBackend(): GameBackend {
  return BACKEND_KIND === 'firebase' ? new FirebaseBackend() : new MockBackend();
}
