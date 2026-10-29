import { useEffect, useState } from 'react';
import { useBackend } from '@/backend/BackendProvider';
import type { LeaderboardView } from '@/backend/types';

/** A live leaderboard for one competition. */
export function useLeaderboard(competitionId: string | null | undefined, limit = 50): LeaderboardView | null {
  const backend = useBackend();
  const [board, setBoard] = useState<LeaderboardView | null>(null);
  useEffect(() => {
    if (!competitionId) return;
    return backend.subscribeLeaderboard(competitionId, setBoard, { limit });
  }, [backend, competitionId, limit]);
  // A board for another competition is stale the moment the id changes.
  return board && board.competitionId === competitionId ? board : null;
}
