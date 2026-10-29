import { describe, expect, it } from 'vitest';
import { addDays, buildDay, localZone } from '@shared/schedule';
import type { DayView, PlayedSummary } from '@/backend/types';
import { actionOf, countdownTarget, primaryCompetition, sessionSlots, statusOf } from './status';

const DAY = '2026-10-29';
const at = (h: number, m = 0) => localZone.toEpoch(DAY, h * 60 + m);

function view(over: Partial<DayView> = {}): DayView {
  return {
    dayKey: DAY,
    competitions: buildDay(DAY, localZone),
    tomorrow: buildDay(addDays(DAY, 1), localZone).filter((c) => c.kind !== 'daily'),
    skipsUsed: 0,
    skipsLeft: 24,
    registered: [],
    played: {},
    activeRun: null,
    liveNow: 0,
    ...over,
  };
}

const find = (day: DayView, kind: string) => day.competitions.find((c) => c.kind === kind)!;

const played = (competitionId: string, score: number): PlayedSummary => ({
  competitionId,
  status: 'done',
  score,
  answered: 10,
  correct: 7,
  wrong: 3,
  silent: 0,
  skips: 0,
  avgMs: 1400,
  finishedAt: at(7),
});

describe('what a competition card offers', () => {
  it('the Daily can be played all day, once', () => {
    const day = view();
    const daily = find(day, 'daily');
    expect(actionOf(daily, at(7), day)).toEqual({ kind: 'play' });
    const after = view({ played: { [daily.id]: played(daily.id, 18) } });
    expect(actionOf(daily, at(7), after)).toEqual({ kind: 'done', score: 18 });
  });

  it('a run in progress comes first', () => {
    const day = view();
    const daily = find(day, 'daily');
    const live = view({ activeRun: { runId: 'r1', competitionId: daily.id }, played: { [daily.id]: { ...played(daily.id, 6), status: 'live' } } });
    expect(actionOf(daily, at(7), live)).toEqual({ kind: 'resume' });
  });

  it('sessions ask you to sign up, then wait for the doors', () => {
    const day = view();
    const zenith = find(day, 'zenith');
    expect(actionOf(zenith, at(9), day)).toEqual({ kind: 'register' });
    const signed = view({ registered: [zenith.id] });
    expect(actionOf(zenith, at(9), signed)).toEqual({ kind: 'registered', opensAt: zenith.opensAt });
    expect(actionOf(zenith, at(13, 5), signed)).toEqual({ kind: 'play' });
    expect(actionOf(zenith, at(13, 5), day)).toEqual({ kind: 'missed' });
  });

  it('then close, and crown someone', () => {
    const day = view();
    const zenith = find(day, 'zenith');
    expect(actionOf(zenith, zenith.closesAt + 1000, day)).toEqual({ kind: 'closing', at: zenith.crownAt });
    expect(actionOf(zenith, zenith.crownAt + 1000, day)).toEqual({ kind: 'final', champion: null });
  });

  it('tomorrow’s sign-up only opens 24 hours ahead', () => {
    const day = view();
    const tomorrowZenith = day.tomorrow.find((c) => c.kind === 'zenith')!;
    expect(actionOf(tomorrowZenith, at(9), day)).toEqual({ kind: 'soon', at: tomorrowZenith.regOpensAt, what: 'signup' });
    expect(actionOf(tomorrowZenith, at(15), day)).toEqual({ kind: 'register' });
  });
});

describe('the Play screen', () => {
  it('is about the Daily, unless a session you signed up for is open', () => {
    const day = view();
    expect(primaryCompetition(day, at(8, 10)).kind).toBe('daily');
    const first = find(day, 'firstlight');
    expect(primaryCompetition(view({ registered: [first.id] }), at(8, 10)).kind).toBe('firstlight');
    // Once you've played it, back to the Daily.
    expect(primaryCompetition(view({ registered: [first.id], played: { [first.id]: played(first.id, 9) } }), at(8, 20)).kind).toBe('daily');
  });

  it('or a run you left going', () => {
    const day = view();
    const zenith = find(day, 'zenith');
    expect(primaryCompetition(view({ activeRun: { runId: 'r', competitionId: zenith.id } }), at(13, 10)).id).toBe(zenith.id);
  });

  it('shows one card per session, moving on to tomorrow once crowned', () => {
    const day = view();
    const morning = sessionSlots(day, at(7));
    expect(morning.map((s) => s.competition.dayKey)).toEqual([DAY, DAY, DAY]);
    const evening = sessionSlots(day, at(16));
    expect(evening.map((s) => [s.competition.kind, s.competition.dayKey === DAY])).toEqual([
      ['firstlight', false],
      ['zenith', false],
      ['bluehour', true],
    ]);
    expect(evening[0].earlier?.kind).toBe('firstlight');
    expect(evening[2].earlier).toBeNull();
  });
});

describe('lobby countdowns', () => {
  it('count to whatever happens next', () => {
    const day = view();
    const zenith = find(day, 'zenith');
    const target = (now: number) => countdownTarget(zenith, statusOf(zenith, now, day));
    expect(target(at(9))).toEqual({ at: zenith.opensAt, to: 'start' });
    expect(target(at(13, 30))).toEqual({ at: zenith.closesAt, to: 'end' });
    expect(target(zenith.closesAt + 1)).toEqual({ at: zenith.crownAt, to: 'winner' });
    expect(target(zenith.crownAt + 1)).toBeNull();
  });
});
