import { SESSIONS, lightForKind, localZone, phaseOf, registrationPhase } from '@shared/schedule';
import type { Competition, CompetitionPhase, LightState, RegistrationPhase } from '@shared/types';
import type { DayView, PlayedSummary } from '@/backend/types';

export interface CompStatus {
  phase: CompetitionPhase;
  reg: RegistrationPhase;
  registered: boolean;
  mine: PlayedSummary | null;
  /** doors open, you may start your one run */
  canEnter: boolean;
  canRegister: boolean;
  canCancel: boolean;
  /** open, but registration was required and you missed it */
  missed: boolean;
  /** you have a run in progress here */
  running: boolean;
}

export function statusOf(c: Competition, now: number, day: DayView | null): CompStatus {
  const phase = phaseOf(c, now);
  const reg = registrationPhase(c, now);
  const registered = Boolean(day?.registered.includes(c.id));
  const mine = day?.played[c.id] ?? null;
  const needsReg = SESSIONS[c.kind].registration;
  const running = day?.activeRun?.competitionId === c.id;
  return {
    phase,
    reg,
    registered,
    mine,
    running,
    canEnter: phase === 'open' && (!needsReg || registered) && !mine,
    canRegister: reg === 'open' && !registered,
    canCancel: reg === 'open' && registered,
    missed: phase === 'open' && needsReg && !registered && !mine,
  };
}

/** The light a competition is painted in. The Daily follows the clock. */
export function lightOf(c: Competition, now: number): LightState {
  return lightForKind(c.kind, localZone.minutesOf(now));
}

/**
 * The competition the Today hero is about: a session whose doors are open
 * (yours first), otherwise the Daily.
 */
export function featured(day: DayView, now: number): Competition {
  const open = day.competitions.filter((c) => c.kind !== 'daily' && phaseOf(c, now) === 'open');
  const mineOpen = open.find((c) => day.registered.includes(c.id) && !day.played[c.id]);
  return mineOpen ?? open[0] ?? day.competitions[0];
}
