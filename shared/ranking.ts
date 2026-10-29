import type { EntryRow, RunTotals } from './types';

/**
 * One sortable number that encodes the tie-break order:
 *   1. most points
 *   2. most questions answered
 *   3. fastest average answer
 * Exact ties beyond that go to whoever finished first (see compareEntries).
 */
export function rankKey(input: { score: number; answered: number; avgMs: number }): number {
  const score = Math.max(-999, Math.min(998, Math.round(input.score))) + 1000;
  const answered = Math.max(0, Math.min(999, Math.round(input.answered)));
  const speed = 99_999 - Math.max(0, Math.min(99_999, Math.round(input.avgMs * 10)));
  return score * 1e8 + answered * 1e5 + speed;
}

export function averageMs(totals: Pick<RunTotals, 'answered' | 'answerMs'>): number {
  return totals.answered > 0 ? totals.answerMs / totals.answered : 0;
}

export function totalsRankKey(totals: RunTotals): number {
  return rankKey({ score: totals.score, answered: totals.answered, avgMs: averageMs(totals) });
}

export function compareEntries(a: EntryRow, b: EntryRow): number {
  if (b.rankKey !== a.rankKey) return b.rankKey - a.rankKey;
  const fa = a.finishedAt ?? Number.MAX_SAFE_INTEGER;
  const fb = b.finishedAt ?? Number.MAX_SAFE_INTEGER;
  if (fa !== fb) return fa - fb;
  return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
}
