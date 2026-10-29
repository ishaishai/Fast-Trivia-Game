import { SESSIONS, SESSION_KINDS, lightForKind, localZone, phaseOf, registrationPhase } from '@shared/schedule';
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

/** What a competition card offers right now: one state, one button. */
export type CardAction =
  | { kind: 'resume' }
  | { kind: 'play' }
  | { kind: 'done'; score: number }
  | { kind: 'register' }
  | { kind: 'registered'; opensAt: number }
  | { kind: 'soon'; at: number; what: 'signup' | 'start' }
  | { kind: 'missed' }
  | { kind: 'closing'; at: number }
  | { kind: 'final'; champion: Competition['champion'] };

export function actionOf(c: Competition, now: number, day: DayView | null): CardAction {
  const st = statusOf(c, now, day);
  if (st.running) return { kind: 'resume' };
  if (st.canEnter) return { kind: 'play' };
  if (st.mine) return { kind: 'done', score: st.mine.score };
  if (st.canRegister) return { kind: 'register' };
  if (st.canCancel || (st.phase === 'upcoming' && st.registered)) return { kind: 'registered', opensAt: c.opensAt };
  if (st.missed) return { kind: 'missed' };
  if (st.phase === 'upcoming') {
    return st.reg === 'not-yet' && c.regOpensAt ? { kind: 'soon', at: c.regOpensAt, what: 'signup' } : { kind: 'soon', at: c.opensAt, what: 'start' };
  }
  if (st.phase === 'closing') return { kind: 'closing', at: c.crownAt };
  return { kind: 'final', champion: c.champion };
}

/**
 * The one game the Play screen is about: a run you left going, else a
 * session you signed up for whose doors are open, else the Daily.
 */
export function primaryCompetition(day: DayView, now: number): Competition {
  const all = [...day.competitions, ...day.tomorrow];
  const running = day.activeRun ? all.find((c) => c.id === day.activeRun!.competitionId) : undefined;
  if (running) return running;
  const mine = day.competitions.find((c) => c.kind !== 'daily' && statusOf(c, now, day).canEnter);
  return mine ?? day.competitions.find((c) => c.kind === 'daily') ?? day.competitions[0];
}

export interface SessionSlot {
  competition: Competition;
  /** today's edition, when the card has already moved on to tomorrow's */
  earlier: Competition | null;
}

/**
 * One card per session. Once today's is over and crowned, its card shows
 * tomorrow's (sign-up opens 24 h ahead), remembering today's winner.
 */
export function sessionSlots(day: DayView, now: number): SessionSlot[] {
  return SESSION_KINDS.flatMap((kind): SessionSlot[] => {
    const today = day.competitions.find((c) => c.kind === kind);
    const next = day.tomorrow.find((c) => c.kind === kind);
    if (today && phaseOf(today, now) === 'final' && next) return [{ competition: next, earlier: today }];
    if (today) return [{ competition: today, earlier: null }];
    return next ? [{ competition: next, earlier: null }] : [];
  });
}

/** What a lobby counts down to, if anything. */
export function countdownTarget(c: Competition, st: CompStatus): { at: number; to: 'signup' | 'start' | 'end' | 'winner' } | null {
  if (st.phase === 'upcoming') return st.reg === 'not-yet' && c.regOpensAt ? { at: c.regOpensAt, to: 'signup' } : { at: c.opensAt, to: 'start' };
  if (st.phase === 'open') return { at: c.closesAt, to: 'end' };
  if (st.phase === 'closing') return { at: c.crownAt, to: 'winner' };
  return null;
}
