import { RULES } from './rules';
import type {
  Competition,
  CompetitionKind,
  CompetitionPhase,
  LightState,
  RegistrationPhase,
  SessionDef,
} from './types';

const HOUR = 60;

export const SESSIONS: Record<CompetitionKind, SessionDef> = {
  daily: {
    kind: 'daily',
    title: 'The Daily',
    eyebrow: 'All day',
    blurb: 'Open midnight to midnight. One run, the same questions for everyone.',
    start: 0,
    end: 24 * HOUR,
    light: 'live',
    registration: false,
  },
  firstlight: {
    kind: 'firstlight',
    title: 'First Light',
    eyebrow: 'Morning session',
    blurb: 'The smallest field of the day. Sharp minds, coffee optional.',
    start: 8 * HOUR,
    end: 9 * HOUR,
    light: 'firstlight',
    registration: true,
  },
  zenith: {
    kind: 'zenith',
    title: 'Zenith',
    eyebrow: 'Afternoon session',
    blurb: 'The sun at its highest. The lunch-break crowd plays fast.',
    start: 13 * HOUR,
    end: 14 * HOUR,
    light: 'zenith',
    registration: true,
  },
  bluehour: {
    kind: 'bluehour',
    title: 'Blue Hour',
    eyebrow: 'Evening session',
    blurb: 'Prime time. The biggest session field, and the loudest finish.',
    start: 20 * HOUR,
    end: 21 * HOUR,
    light: 'bluehour',
    registration: true,
  },
};

export const KINDS: CompetitionKind[] = ['daily', 'firstlight', 'zenith', 'bluehour'];
export const SESSION_KINDS: CompetitionKind[] = ['firstlight', 'zenith', 'bluehour'];

/** Converts between wall-clock time in a time zone and epoch milliseconds. */
export interface ZoneResolver {
  id: string;
  toEpoch(dayKey: string, minutes: number): number;
  dayKeyOf(epoch: number): string;
  minutesOf(epoch: number): number;
}

export function parseDayKey(dayKey: string): [number, number, number] {
  const [y, m, d] = dayKey.split('-').map((n) => parseInt(n, 10));
  return [y, m, d];
}

export function formatDayKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function addDays(dayKey: string, days: number): string {
  const [y, m, d] = parseDayKey(dayKey);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return formatDayKey(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** The device's own time zone (used by the offline mock). */
export const localZone: ZoneResolver = {
  id: 'local',
  toEpoch(dayKey, minutes) {
    const [y, m, d] = parseDayKey(dayKey);
    return new Date(y, m - 1, d, 0, minutes, 0, 0).getTime();
  },
  dayKeyOf(epoch) {
    const t = new Date(epoch);
    return formatDayKey(t.getFullYear(), t.getMonth() + 1, t.getDate());
  },
  minutesOf(epoch) {
    const t = new Date(epoch);
    return t.getHours() * 60 + t.getMinutes() + t.getSeconds() / 60;
  },
};

/** An IANA time zone (used by the server, e.g. "UTC" or "Asia/Jerusalem"). */
export function ianaZone(timeZone: string): ZoneResolver {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = (epoch: number) => {
    const out: Record<string, number> = {};
    for (const p of dtf.formatToParts(new Date(epoch))) {
      if (p.type !== 'literal') out[p.type] = parseInt(p.value, 10);
    }
    return out;
  };
  const offset = (epoch: number) => {
    const p = parts(epoch);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
    return asUtc - Math.floor(epoch / 1000) * 1000;
  };
  return {
    id: timeZone,
    toEpoch(dayKey, minutes) {
      const [y, m, d] = parseDayKey(dayKey);
      const guess = Date.UTC(y, m - 1, d, 0, minutes);
      const first = guess - offset(guess);
      const second = guess - offset(first);
      return second;
    },
    dayKeyOf(epoch) {
      const p = parts(epoch);
      return formatDayKey(p.year, p.month, p.day);
    },
    minutesOf(epoch) {
      const p = parts(epoch);
      return (p.hour % 24) * 60 + p.minute + p.second / 60;
    },
  };
}

export function competitionId(dayKey: string, kind: CompetitionKind): string {
  return `${dayKey}_${kind}`;
}

export function parseCompetitionId(id: string): { dayKey: string; kind: CompetitionKind } | null {
  const match = /^(\d{4}-\d{2}-\d{2})_(daily|firstlight|zenith|bluehour)$/.exec(id);
  if (!match) return null;
  return { dayKey: match[1], kind: match[2] as CompetitionKind };
}

export function buildCompetition(dayKey: string, kind: CompetitionKind, zone: ZoneResolver): Competition {
  const s = SESSIONS[kind];
  const opensAt = zone.toEpoch(dayKey, s.start);
  const closesAt = zone.toEpoch(dayKey, s.end);
  return {
    id: competitionId(dayKey, kind),
    kind,
    dayKey,
    opensAt,
    closesAt,
    crownAt: closesAt + RULES.CROWN_GRACE_MS,
    regOpensAt: s.registration ? opensAt - RULES.REGISTRATION_LEAD_MS : null,
    regClosesAt: s.registration ? opensAt : null,
    runMs: RULES.RUN_MS,
    questionMs: RULES.QUESTION_MS,
    deckSize: RULES.DECK_SIZE,
    registeredCount: 0,
    playersCount: 0,
    liveCount: 0,
    champion: null,
  };
}

export function buildDay(dayKey: string, zone: ZoneResolver): Competition[] {
  return KINDS.map((kind) => buildCompetition(dayKey, kind, zone));
}

export function phaseOf(c: Pick<Competition, 'opensAt' | 'closesAt' | 'crownAt'>, now: number): CompetitionPhase {
  if (now < c.opensAt) return 'upcoming';
  if (now < c.closesAt) return 'open';
  if (now < c.crownAt) return 'closing';
  return 'final';
}

export function registrationPhase(
  c: Pick<Competition, 'regOpensAt' | 'regClosesAt'>,
  now: number,
): RegistrationPhase {
  if (c.regOpensAt === null || c.regClosesAt === null) return 'none';
  if (now < c.regOpensAt) return 'not-yet';
  if (now < c.regClosesAt) return 'open';
  return 'closed';
}

/** Light state for a wall-clock minute of the day. */
export function lightForMinutes(minutes: number): LightState {
  if (minutes >= 5 * HOUR && minutes < 11 * HOUR) return 'firstlight';
  if (minutes >= 11 * HOUR && minutes < 17 * HOUR) return 'zenith';
  if (minutes >= 17 * HOUR && minutes < 22 * HOUR) return 'bluehour';
  return 'midnight';
}

export function lightForKind(kind: CompetitionKind, nowMinutes: number): LightState {
  const light = SESSIONS[kind].light;
  return light === 'live' ? lightForMinutes(nowMinutes) : light;
}

/** "08:00" style label for minutes from midnight. */
export function minutesLabel(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
}
