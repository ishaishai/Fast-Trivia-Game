import type { Competition } from '@shared/types';
import { copy } from '@/copy/en';
import { clockTime, humanDuration, signed } from './format';
import type { CardAction } from './status';

/** One short sentence for a competition card. */
export function statusLine(action: CardAction, c: Competition, now: number): string {
  const s = copy.status;
  switch (action.kind) {
    case 'resume':
      return s.stillGoing;
    case 'play':
      return c.kind === 'daily' ? s.playAllDay : s.playUntil(clockTime(c.closesAt));
    case 'done':
      return s.scored(signed(action.score));
    case 'register':
      return s.startsAt(clockTime(c.opensAt));
    case 'registered':
      return s.youreIn(humanDuration(action.opensAt - now));
    case 'soon':
      return action.what === 'signup' ? s.signupIn(humanDuration(action.at - now)) : s.startsIn(humanDuration(action.at - now));
    case 'missed':
      return s.missed;
    case 'closing':
      return s.winnerIn(humanDuration(action.at - now));
    case 'final':
      return action.champion ? s.winner(action.champion.handle, signed(action.champion.score)) : s.noWinner;
  }
}
