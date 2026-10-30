import { rankKey } from '@shared/ranking';
import { clamp, normal, rngFor } from '@shared/random';
import { RULES } from '@shared/rules';
import type { Competition, CompetitionKind, EntryRow } from '@shared/types';
import { CITIES, FIRST, REGULARS, TAILS } from './names';

/**
 * A deterministic field of rivals for each competition. Everything is derived
 * from the competition id, so the field is identical on every reload and the
 * leaderboard at any moment is a pure function of the clock.
 */
export interface Rival {
  uid: string;
  handle: string;
  city: string;
  avatarSeed: number;
  regular: boolean;
  registeredAt: number | null;
  startAt: number;
  endAt: number;
  score: number;
  answered: number;
  correct: number;
  wrong: number;
  silent: number;
  skips: number;
  avgMs: number;
  rankKey: number;
}

/**
 * Field size and score distribution per competition. The best score of a
 * field lands near mean + sd × (expected maximum of N normals):
 * First Light ≈ 72, Zenith ≈ 82, Blue Hour ≈ 90, The Daily ≈ 105.
 */
const FIELDS: Record<CompetitionKind, { min: number; max: number; mean: number; sd: number }> = {
  daily: { min: 2400, max: 3200, mean: 40, sd: 19 },
  bluehour: { min: 900, max: 1200, mean: 35, sd: 17 },
  zenith: { min: 600, max: 800, mean: 32, sd: 16 },
  firstlight: { min: 350, max: 480, mean: 28, sd: 14.5 },
};

const cache = new Map<string, Rival[]>();
const CACHE_LIMIT = 24;

export function fieldFor(c: Competition): Rival[] {
  const hit = cache.get(c.id);
  if (hit) return hit;
  const field = generate(c);
  cache.set(c.id, field);
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
  return field;
}

function generate(c: Competition): Rival[] {
  const rng = rngFor(`glint:rivals:${c.id}`);
  const f = FIELDS[c.kind];
  const size = Math.round(f.min + (f.max - f.min) * rng());
  const rivals: Rival[] = [];
  const taken = new Set<string>();

  REGULARS.forEach((reg, i) => {
    if (rng() < 0.62) {
      taken.add(reg.handle);
      rivals.push(make(c, rng, f, { uid: `reg-${i}`, handle: reg.handle, city: reg.city, z: 2.3 + 0.55 * normal(rng), regular: true }));
    }
  });

  for (let i = 0; i < size; i++) {
    let handle = FIRST[Math.floor(rng() * FIRST.length)] + TAILS[Math.floor(rng() * TAILS.length)];
    while (taken.has(handle)) handle += Math.floor(rng() * 10);
    taken.add(handle);
    rivals.push(
      make(c, rng, f, {
        uid: `riv-${c.id}-${i}`,
        handle,
        city: CITIES[Math.floor(rng() * CITIES.length)],
        z: normal(rng),
        regular: false,
      }),
    );
  }
  return rivals;
}

function make(
  c: Competition,
  rng: () => number,
  f: { mean: number; sd: number },
  who: { uid: string; handle: string; city: string; z: number; regular: boolean },
): Rival {
  const target = Math.round(f.mean + f.sd * who.z);
  const speedZ = 0.65 * who.z + 0.75 * normal(rng);
  const answered = Math.round(clamp(30 + 8.5 * speedZ, 8, 62));
  const silent = Math.max(0, Math.round(Math.abs(normal(rng)) * (answered < 22 ? 2.2 : 1.1)));
  const skips = Math.floor(rng() ** 2 * 9);
  const correct = clamp(Math.round((target + answered + silent) / 4), 0, answered);
  const wrong = answered - correct;
  const score = 3 * correct - wrong - silent;
  const answeringTime = RULES.RUN_MS - silent * RULES.QUESTION_MS - skips * 450;
  const avgMs = Math.round(clamp(answeringTime / Math.max(1, answered), 620, 2950));
  const seen = answered + silent + skips;
  const duration = RULES.INTRO_MS + RULES.RUN_MS + seen * (RULES.FEEDBACK_MS + 140);
  const startAt = startTime(c, rng, duration);
  const registeredAt = c.regOpensAt === null ? null : c.opensAt - Math.floor(RULES.REGISTRATION_LEAD_MS * rng() ** 1.6) - 1000;
  return {
    uid: who.uid,
    handle: who.handle,
    city: who.city,
    avatarSeed: Math.floor(rng() * 1e6),
    regular: who.regular,
    registeredAt,
    startAt,
    endAt: startAt + duration,
    score,
    answered,
    correct,
    wrong,
    silent,
    skips,
    avgMs,
    rankKey: rankKey({ score, answered, avgMs }),
  };
}

function startTime(c: Competition, rng: () => number, duration: number): number {
  const latest = c.closesAt - duration - 1000;
  if (c.kind === 'daily') {
    const r = rng();
    let minutes: number;
    if (r < 0.22) minutes = 8.5 * 60 + normal(rng) * 55;
    else if (r < 0.42) minutes = 13 * 60 + normal(rng) * 45;
    else if (r < 0.74) minutes = 21 * 60 + normal(rng) * 75;
    else minutes = 20 + rng() * (23.4 * 60);
    return Math.min(latest, c.opensAt + Math.round(clamp(minutes, 1, 24 * 60 - 2) * 60_000));
  }
  const window = c.closesAt - c.opensAt;
  return Math.min(latest, c.opensAt + Math.floor(window * 0.85 * rng() ** 2.2) + Math.floor(rng() * 15_000));
}

/** A rival's leaderboard row at time t (null if they haven't started). */
export function rivalRow(r: Rival, t: number): EntryRow | null {
  if (t < r.startAt) return null;
  const base = {
    uid: r.uid,
    handle: r.handle,
    city: r.city,
    avatarSeed: r.avatarSeed,
    startedAt: r.startAt,
    regular: r.regular,
  };
  if (t >= r.endAt) {
    return {
      ...base,
      score: r.score,
      answered: r.answered,
      correct: r.correct,
      wrong: r.wrong,
      silent: r.silent,
      skips: r.skips,
      avgMs: r.avgMs,
      status: 'done',
      rankKey: r.rankKey,
      finishedAt: r.endAt,
    };
  }
  const p = clamp((t - r.startAt - RULES.INTRO_MS) / (r.endAt - r.startAt - RULES.INTRO_MS), 0, 1);
  const correct = Math.floor(r.correct * p);
  const wrong = Math.floor(r.wrong * p);
  const silent = Math.floor(r.silent * p);
  const answered = correct + wrong;
  const score = 3 * correct - wrong - silent;
  return {
    ...base,
    score,
    answered,
    correct,
    wrong,
    silent,
    skips: Math.floor(r.skips * p),
    avgMs: r.avgMs,
    status: 'live',
    rankKey: rankKey({ score, answered, avgMs: r.avgMs }),
    finishedAt: null,
  };
}

export interface FieldCounts {
  registered: number;
  players: number;
  live: number;
}

export function countField(field: Rival[], t: number): FieldCounts {
  let registered = 0;
  let players = 0;
  let live = 0;
  for (const r of field) {
    if (r.registeredAt !== null && r.registeredAt <= t) registered += 1;
    if (r.startAt <= t) {
      players += 1;
      if (t < r.endAt) live += 1;
    }
  }
  return { registered, players, live };
}

/** The rival who holds the crown once the competition is final. */
export function bestRival(field: Rival[]): Rival | null {
  let best: Rival | null = null;
  for (const r of field) {
    if (!best || r.rankKey > best.rankKey || (r.rankKey === best.rankKey && r.endAt < best.endAt)) best = r;
  }
  return best;
}
