import { useEffect, useMemo, useState } from 'react';
import type { ChampionRecord } from '@shared/types';
import { useBackend } from '@/backend/BackendProvider';
import { useGame } from '@/stores/game';

export interface Regular {
  uid: string;
  handle: string;
  city: string;
  seed: number;
  crowns: number;
}

/** Recent champions, grouped by day, with the most-crowned players and your own count. */
export function useChampions(days = 14) {
  const backend = useBackend();
  const uid = useGame((s) => s.profile?.uid);
  const dayKey = useGame((s) => s.day?.dayKey);
  const [records, setRecords] = useState<ChampionRecord[] | null>(null);
  useEffect(() => {
    let alive = true;
    void backend.getChampions(days).then((r) => alive && setRecords(r));
    return () => {
      alive = false;
    };
  }, [backend, dayKey, days]);

  return useMemo(() => {
    const byDay = new Map<string, ChampionRecord[]>();
    const counts = new Map<string, Regular>();
    for (const r of records ?? []) {
      byDay.set(r.dayKey, [...(byDay.get(r.dayKey) ?? []), r]);
      const e = counts.get(r.uid) ?? { uid: r.uid, handle: r.handle, city: r.city, seed: r.avatarSeed, crowns: 0 };
      e.crowns += 1;
      counts.set(r.uid, e);
    }
    return {
      records,
      byDay: [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)),
      regulars: [...counts.values()].sort((a, b) => b.crowns - a.crowns).slice(0, 3),
      mine: (records ?? []).filter((r) => r.uid === uid),
    };
  }, [records, uid]);
}
