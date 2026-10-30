import { FieldValue, getFirestore, type Transaction } from 'firebase-admin/firestore';
import { buildDeck, lookupFor } from '../../shared/deck';
import { GameError } from '../../shared/errors';
import { cleanCity, handleProblem, normalizeHandle } from '../../shared/handles';
import { BANK } from '../../shared/questions/bank';
import { compareEntries, rankKey } from '../../shared/ranking';
import { RULES } from '../../shared/rules';
import {
  applyAnswer,
  applySkip,
  applyTimeout,
  createRun,
  currentQuestion,
  finishRun,
  resumeRun,
  summarize,
  totalsOf,
} from '../../shared/run';
import {
  SESSIONS,
  addDays,
  buildDay,
  parseCompetitionId,
  phaseOf,
  registrationPhase,
  type ZoneResolver,
} from '../../shared/schedule';
import type {
  AnswerResult,
  ChampionRecord,
  Competition,
  EntryRow,
  Profile,
  RunStart,
  RunState,
  RunSummary,
} from '../../shared/types';

/**
 * Server-side Glint! Every rule lives in ../shared and is identical to
 * the offline mock; this file only adds persistence, transactions and the
 * things a server must own: identity, the clock, and the crown.
 */

const lookup = lookupFor(BANK);
const db = () => getFirestore();

const ref = {
  user: (uid: string) => db().collection('users').doc(uid),
  day: (uid: string, dayKey: string) => db().collection('users').doc(uid).collection('days').doc(dayKey),
  history: (uid: string, cid: string) => db().collection('users').doc(uid).collection('history').doc(cid),
  handle: (handle: string) => db().collection('handles').doc(handle),
  competition: (cid: string) => db().collection('competitions').doc(cid),
  entry: (cid: string, uid: string) => db().collection('competitions').doc(cid).collection('entries').doc(uid),
  registration: (cid: string, uid: string) => db().collection('competitions').doc(cid).collection('registrations').doc(uid),
  run: (runId: string) => db().collection('runs').doc(runId),
  champion: (cid: string) => db().collection('champions').doc(cid),
};

interface RunDoc {
  uid: string;
  cid: string;
  status: 'live' | 'done';
  state: RunState;
  lastPublicAt: number;
  unpublished: number;
}

interface DayDoc {
  skipsUsed?: number;
  registered?: string[];
  played?: Record<string, unknown>;
  activeRun?: { runId: string; competitionId: string } | null;
}

/** Leaderboard entries are written at most every 3 answers or 2.5 s, plus at the end. */
const PUBLISH_EVERY = 3;
const PUBLISH_MS = 2500;

function asCompetition(data: FirebaseFirestore.DocumentData): Competition {
  const c = data as Partial<Competition> & Competition;
  return {
    ...c,
    registeredCount: c.registeredCount ?? 0,
    playersCount: c.playersCount ?? 0,
    liveCount: c.liveCount ?? 0,
    champion: c.champion ?? null,
  };
}

// --------------------------------------------------------------- schedule --

export async function ensureDay(dayKey: string, zone: ZoneResolver): Promise<void> {
  const comps = buildDay(dayKey, zone);
  const snaps = await db().getAll(...comps.map((c) => ref.competition(c.id)));
  const batch = db().batch();
  let writes = 0;
  snaps.forEach((snap, i) => {
    if (!snap.exists) {
      batch.set(ref.competition(comps[i].id), comps[i]);
      writes += 1;
    }
  });
  if (writes) await batch.commit();
}

async function mustCompetition(cid: string, zone: ZoneResolver): Promise<Competition> {
  const parsed = parseCompetitionId(cid);
  if (!parsed) throw new GameError('not-found');
  let snap = await ref.competition(cid).get();
  if (!snap.exists) {
    await ensureDay(parsed.dayKey, zone);
    snap = await ref.competition(cid).get();
  }
  if (!snap.exists) throw new GameError('not-found');
  return asCompetition(snap.data()!);
}

// ---------------------------------------------------------------- profile --

export async function upsertProfile(uid: string, input: { handle: unknown; city: unknown }, now: number): Promise<Profile> {
  if (typeof input.handle !== 'string') throw new GameError('invalid');
  const handle = normalizeHandle(input.handle);
  const problem = handleProblem(handle);
  if (problem) throw new GameError('invalid', problem);
  const city = typeof input.city === 'string' ? cleanCity(input.city) : '';
  return db().runTransaction(async (tx) => {
    const [userSnap, handleSnap] = await Promise.all([tx.get(ref.user(uid)), tx.get(ref.handle(handle))]);
    if (handleSnap.exists && handleSnap.get('uid') !== uid) throw new GameError('handle-taken');
    const previous = userSnap.exists ? (userSnap.data() as Profile) : null;
    if (previous && previous.handle !== handle) tx.delete(ref.handle(previous.handle));
    tx.set(ref.handle(handle), { uid });
    const profile: Profile = {
      uid,
      handle,
      city,
      avatarSeed: previous?.avatarSeed ?? Math.floor(Math.random() * 1e6),
      createdAt: previous?.createdAt ?? now,
    };
    tx.set(ref.user(uid), profile, { merge: true });
    return profile;
  });
}

// ----------------------------------------------------------- registration --

export async function register(uid: string, cid: string, now: number, zone: ZoneResolver, cancel = false): Promise<void> {
  const c = await mustCompetition(cid, zone);
  const phase = registrationPhase(c, now);
  if (phase === 'none') throw new GameError('registration-not-required');
  if (phase === 'not-yet') throw new GameError('registration-not-open');
  if (phase === 'closed') throw new GameError('registration-closed');
  await db().runTransaction(async (tx) => {
    const reg = await tx.get(ref.registration(cid, uid));
    if (cancel ? !reg.exists : reg.exists) return;
    if (cancel) tx.delete(ref.registration(cid, uid));
    else tx.set(ref.registration(cid, uid), { uid, at: now });
    tx.update(ref.competition(cid), { registeredCount: FieldValue.increment(cancel ? -1 : 1) });
    tx.set(ref.day(uid, c.dayKey), { registered: cancel ? FieldValue.arrayRemove(cid) : FieldValue.arrayUnion(cid) }, { merge: true });
  });
}

// -------------------------------------------------------------------- run --

function skipsLeft(day: DayDoc | undefined): number {
  return Math.max(0, RULES.SKIPS_PER_DAY - (day?.skipsUsed ?? 0));
}

function toStart(state: RunState, now: number, left: number, resumed: boolean, elapsed: number): RunStart {
  const question = currentQuestion(state, lookup);
  if (!question || !state.current) throw new GameError('run-over');
  return {
    runId: state.runId,
    competitionId: state.cid,
    question,
    questionElapsedMs: elapsed,
    graceMs: state.current.graceMs,
    totals: totalsOf(state),
    timeUsedMs: state.timeUsedMs,
    runMs: state.runMs,
    questionMs: state.questionMs,
    skipsLeft: left,
    resumed,
    serverNow: now,
  };
}

function entryFrom(state: RunState, profile: Profile): EntryRow {
  const t = totalsOf(state);
  const avgMs = t.answered ? t.answerMs / t.answered : 0;
  return {
    uid: profile.uid,
    handle: profile.handle,
    city: profile.city,
    avatarSeed: profile.avatarSeed,
    score: t.score,
    answered: t.answered,
    correct: t.correct,
    wrong: t.wrong,
    silent: t.silent,
    skips: t.skips,
    avgMs: Math.round(avgMs),
    status: state.status,
    rankKey: rankKey({ score: t.score, answered: t.answered, avgMs }),
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
  };
}

export async function startRun(uid: string, cid: string, now: number, zone: ZoneResolver): Promise<RunStart> {
  const c = await mustCompetition(cid, zone);
  const phase = phaseOf(c, now);
  if (phase === 'upcoming') throw new GameError('not-open');
  if (phase !== 'open') throw new GameError('closed');
  return db().runTransaction(async (tx) => {
    const [entrySnap, userSnap, daySnap, regSnap] = await Promise.all([
      tx.get(ref.entry(cid, uid)),
      tx.get(ref.user(uid)),
      tx.get(ref.day(uid, c.dayKey)),
      tx.get(ref.registration(cid, uid)),
    ]);
    if (!userSnap.exists) throw new GameError('unauthenticated', 'Choose a name before you play.');
    if (SESSIONS[c.kind].registration && !regSnap.exists) throw new GameError('not-registered');
    if (entrySnap.exists) throw new GameError('already-played');
    const profile = userSnap.data() as Profile;
    const runId = ref.run('x').parent.doc().id;
    const state = createRun({ runId, uid, cid, dayKey: c.dayKey, deck: buildDeck(cid, BANK), now });
    const run: RunDoc = { uid, cid, status: 'live', state, lastPublicAt: now, unpublished: 0 };
    tx.set(ref.run(runId), run);
    tx.set(ref.entry(cid, uid), entryFrom(state, profile));
    tx.update(ref.competition(cid), { playersCount: FieldValue.increment(1), liveCount: FieldValue.increment(1) });
    tx.set(ref.day(uid, c.dayKey), { activeRun: { runId, competitionId: cid } }, { merge: true });
    return toStart(state, now, skipsLeft(daySnap.data() as DayDoc | undefined), false, 0);
  });
}

/** Writes a run's new state; publishes its entry when due; settles everything when it ends. */
async function commitRun(tx: Transaction, run: RunDoc, next: RunState, now: number, skipUsed: boolean): Promise<void> {
  const userSnap = await tx.get(ref.user(run.uid));
  const profile = userSnap.data() as Profile & { stats?: Record<string, number> };
  const unpublished = run.unpublished + 1;
  const due = next.status === 'done' || unpublished >= PUBLISH_EVERY || now - run.lastPublicAt >= PUBLISH_MS;
  tx.set(ref.run(next.runId), {
    ...run,
    status: next.status,
    state: next,
    lastPublicAt: due ? now : run.lastPublicAt,
    unpublished: due ? 0 : unpublished,
  });
  if (due) tx.set(ref.entry(next.cid, run.uid), entryFrom(next, profile));
  if (skipUsed) tx.set(ref.day(run.uid, next.dayKey), { skipsUsed: FieldValue.increment(1) }, { merge: true });
  if (next.status !== 'done') return;

  const summary = summarize(next, lookup);
  const t = summary.totals;
  tx.set(ref.history(run.uid, next.cid), summary);
  tx.update(ref.competition(next.cid), { liveCount: FieldValue.increment(-1) });
  tx.set(
    ref.day(run.uid, next.dayKey),
    {
      activeRun: null,
      played: {
        [next.cid]: {
          competitionId: next.cid,
          status: 'done',
          score: t.score,
          answered: t.answered,
          correct: t.correct,
          wrong: t.wrong,
          silent: t.silent,
          skips: t.skips,
          avgMs: Math.round(summary.avgMs),
          finishedAt: summary.finishedAt,
        },
      },
    },
    { merge: true },
  );
  const best = profile.stats?.bestScore;
  tx.set(
    ref.user(run.uid),
    {
      stats: {
        runs: FieldValue.increment(1),
        correct: FieldValue.increment(t.correct),
        wrong: FieldValue.increment(t.wrong),
        silent: FieldValue.increment(t.silent),
        skips: FieldValue.increment(t.skips),
        answered: FieldValue.increment(t.answered),
        answerMs: FieldValue.increment(Math.round(t.answerMs)),
        bestScore: best === undefined || best === null ? t.score : Math.max(best, t.score),
      },
    },
    { merge: true },
  );
}

type RunOp =
  | { kind: 'answer'; seq: number; choice: number; clientMs: number }
  | { kind: 'skip'; seq: number; clientMs: number }
  | { kind: 'timeout'; seq: number };

export async function runAction(uid: string, runId: string, op: RunOp, now: number): Promise<AnswerResult> {
  return db().runTransaction(async (tx) => {
    const runSnap = await tx.get(ref.run(runId));
    if (!runSnap.exists) throw new GameError('not-found');
    const run = runSnap.data() as RunDoc;
    if (run.uid !== uid) throw new GameError('not-found');
    const daySnap = await tx.get(ref.day(uid, run.state.dayKey));
    const left = skipsLeft(daySnap.data() as DayDoc | undefined);
    let next: RunState;
    let result: AnswerResult;
    let skipUsed = false;
    if (op.kind === 'answer') {
      ({ state: next, result } = applyAnswer(run.state, op, now, left, lookup));
    } else if (op.kind === 'skip') {
      const out = applySkip(run.state, op, now, left, lookup);
      ({ state: next, result, skipUsed } = out);
    } else {
      ({ state: next, result } = applyTimeout(run.state, op, now, left, lookup));
    }
    await commitRun(tx, run, next, now, skipUsed);
    return result;
  });
}

export async function finish(uid: string, runId: string, reason: 'sunset' | 'quit', clientMs: number | undefined, now: number): Promise<RunSummary> {
  return db().runTransaction(async (tx) => {
    const runSnap = await tx.get(ref.run(runId));
    if (!runSnap.exists) throw new GameError('not-found');
    const run = runSnap.data() as RunDoc;
    if (run.uid !== uid) throw new GameError('not-found');
    if (run.status === 'done') {
      const history = await tx.get(ref.history(uid, run.cid));
      return (history.data() as RunSummary) ?? summarize(run.state, lookup);
    }
    const next = finishRun(run.state, now, reason, clientMs);
    await commitRun(tx, run, next, now, false);
    return summarize(next, lookup);
  });
}

export async function resume(uid: string, cid: string, now: number): Promise<RunStart | null> {
  const parsed = parseCompetitionId(cid);
  if (!parsed) throw new GameError('not-found');
  const daySnap = await ref.day(uid, parsed.dayKey).get();
  const active = (daySnap.data() as DayDoc | undefined)?.activeRun;
  if (!active || active.competitionId !== cid) return null;
  return db().runTransaction(async (tx) => {
    const runSnap = await tx.get(ref.run(active.runId));
    if (!runSnap.exists) return null;
    const run = runSnap.data() as RunDoc;
    if (run.uid !== uid || run.status === 'done') return null;
    const daySnapTx = await tx.get(ref.day(uid, run.state.dayKey));
    const left = skipsLeft(daySnapTx.data() as DayDoc | undefined);
    const out = resumeRun(run.state, now, left, lookup);
    if (out.state !== run.state) await commitRun(tx, run, out.state, now, false);
    if (out.state.status === 'done') return null;
    return toStart(out.state, now, left, true, out.elapsedMs);
  });
}

// ------------------------------------------------------------------ crown --

/** Settles a competition: ends abandoned runs, then crowns the best entry. Idempotent. */
export async function crown(c: Competition, now: number): Promise<void> {
  if (now < c.crownAt) return;
  const live = await db().collection('runs').where('cid', '==', c.id).where('status', '==', 'live').get();
  for (const doc of live.docs) {
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(doc.ref);
      const run = snap.data() as RunDoc;
      if (run.status === 'done') return;
      await commitRun(tx, run, finishRun(run.state, now, 'quit', 0), now, false);
    });
  }
  const top = await ref.competition(c.id).collection('entries').orderBy('rankKey', 'desc').limit(8).get();
  const rows = top.docs.map((d) => d.data() as EntryRow).sort(compareEntries);
  const best = rows[0];
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref.competition(c.id));
    if (snap.get('finalized')) return;
    const champion = best
      ? { uid: best.uid, handle: best.handle, city: best.city, avatarSeed: best.avatarSeed, score: best.score, answered: best.answered }
      : null;
    tx.update(ref.competition(c.id), { champion, finalized: true, liveCount: 0 });
    if (best) {
      const record: ChampionRecord = {
        ...champion!,
        competitionId: c.id,
        kind: c.kind,
        dayKey: c.dayKey,
        closesAt: c.closesAt,
        players: (snap.get('playersCount') as number | undefined) ?? rows.length,
      };
      tx.set(ref.champion(c.id), record);
      tx.set(ref.user(best.uid), { crowns: FieldValue.increment(1) }, { merge: true });
    }
  });
}

/** Every few minutes: make sure today and tomorrow exist, and crown whatever has closed. */
export async function tick(now: number, zone: ZoneResolver): Promise<void> {
  const today = zone.dayKeyOf(now);
  await ensureDay(today, zone);
  await ensureDay(addDays(today, 1), zone);
  const recent = await db()
    .collection('competitions')
    .where('dayKey', 'in', [addDays(today, -1), today])
    .get();
  for (const doc of recent.docs) {
    const c = asCompetition(doc.data());
    if (!doc.get('finalized') && now >= c.crownAt) await crown(c, now);
  }
}
