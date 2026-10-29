import { create } from 'zustand';
import type { RunSummary } from '@shared/types';

/** The last practice run lives only in memory — it never counted. */
export const usePracticeResult = create<{ summary: RunSummary | null; set: (s: RunSummary) => void }>()((set) => ({
  summary: null,
  set: (summary) => set({ summary }),
}));
