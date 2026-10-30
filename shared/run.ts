import { toPublicQuestion, type QuestionLookup } from './deck';
import { GameError } from './errors';
import { averageMs, rankKey } from './ranking';
import { RULES } from './rules';
import type {
  AnswerResult,
  DeckItem,
  HistoryItem,
  OverReason,
  Outcome,
  PublicQuestion,
  ReviewItem,
  RunState,
  RunSummary,
  RunTotals,
} from './types';

/**
 * The run engine. Pure functions over a serialisable RunState, used verbatim
 * by the offline mock and by the Cloud Function. `now` is always the server's
 * clock; the client's own measurement of its thinking time is accepted only
 * within what the server's clock allows (see acceptedThinkMs).
 */

export function emptyTotals(): RunTotals {
  return { score: 0, correct: 0, wrong: 0, silent: 0, skips: 0, answered: 0, streak: 0, bestStreak: 0, answerMs: 0 };
}

export function totalsOf(state: RunState): RunTotals {
  const { score, correct, wrong, silent, skips, answered, streak, bestStreak, answerMs } = state;
  return { score, correct, wrong, silent, skips, answered, streak, bestStreak, answerMs };
}

export interface CreateRunInput {
  runId: string;
  uid: string;
  cid: string;
  dayKey: string;
  deck: DeckItem[];
  now: number;
  runMs?: number;
  questionMs?: number;
}

export function createRun(input: CreateRunInput): RunState {
  if (input.deck.length === 0) throw new GameError('invalid', 'This competition has no questions.');
  return {
    ...emptyTotals(),
    runId: input.runId,
    uid: input.uid,
    cid: input.cid,
    dayKey: input.dayKey,
    deck: input.deck,
    cursor: 0,
    seq: 0,
    current: { seq: 0, deckIndex: 0, sentAt: input.now, graceMs: RULES.INTRO_MS },
    timeUsedMs: 0,
    runMs: input.runMs ?? RULES.RUN_MS,
    questionMs: input.questionMs ?? RULES.QUESTION_MS,
    history: [],
    status: 'live',
    overReason: null,
    startedAt: input.now,
    finishedAt: null,
  };
}

function clone(state: RunState): RunState {
  return { ...state, history: state.history.slice(), current: state.current ? { ...state.current } : null };
}

function assertLive(state: RunState, seq: number): void {
  if (state.status !== 'live' || !state.current) throw new GameError('run-over');
  if (seq !== state.current.seq) throw new GameError('bad-seq');
}

/**
 * Thinking time the server accepts for the question on screen.
 * The upper bound is what the server's clock allows (elapsed minus the
 * transition the client is known to play first). The lower bound forgives up
 * to RTT_ALLOWANCE_MS of network time: honest players are measured exactly by
 * their own device; a client that under-reports gains at most that allowance.
 */
export function acceptedThinkMs(state: RunState, clientMs: number, now: number): number {
  const current = state.current;
  if (!current) return 0;
  const hi = Math.max(0, now - current.sentAt - current.graceMs);
  const lo = Math.max(0, hi - RULES.RTT_ALLOWANCE_MS);
  const claimed = Number.isFinite(clientMs) ? clientMs : hi;
  return Math.round(Math.min(hi, Math.max(lo, claimed)));
}

export function remainingMs(state: RunState): number {
  return Math.max(0, state.runMs - state.timeUsedMs);
}

type Action = { type: 'answer'; choice: number } | { type: 'skip' } | { type: 'timeout' };

interface Settled {
  state: RunState;
  outcome: Outcome;
  delta: number;
  thinkMs: number;
  choice: number | null;
  correctIndex: number | null;
}

function settle(prev: RunState, action: Action, thinkMs: number, now: number): Settled {
  const state = clone(prev);
  const current = state.current!;
  const item = state.deck[current.deckIndex];
  const remaining = state.runMs - state.timeUsedMs;
  const deadline = state.questionMs + RULES.DEADLINE_GRACE_MS;
  const choice = action.type === 'answer' ? action.choice : null;

  let outcome: Outcome;
  let delta = 0;
  let used: number;

  if (thinkMs > remaining + RULES.SUNSET_GRACE_MS) {
    // The sun had already set: nothing scores, the run is over.
    outcome = 'sunset';
    used = remaining;
  } else if (action.type === 'timeout' || thinkMs > deadline) {
    outcome = 'silent';
    delta = RULES.POINTS_SILENT;
    used = Math.min(state.questionMs, remaining);
  } else if (action.type === 'skip') {
    outcome = 'skipped';
    delta = RULES.POINTS_SKIP;
    used = Math.min(thinkMs, remaining);
  } else {
    outcome = action.choice === item.correct ? 'correct' : 'wrong';
    delta = outcome === 'correct' ? RULES.POINTS_CORRECT : RULES.POINTS_WRONG;
    used = Math.min(thinkMs, remaining);
  }

  state.score += delta;
  if (outcome === 'correct') {
    state.correct += 1;
    state.answered += 1;
    state.answerMs += used;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
  } else if (outcome === 'wrong') {
    state.wrong += 1;
    state.answered += 1;
    state.answerMs += used;
    state.streak = 0;
  } else if (outcome === 'silent') {
    state.silent += 1;
    state.streak = 0;
  } else if (outcome === 'skipped') {
    state.skips += 1;
  }

  state.timeUsedMs = Math.min(state.runMs, state.timeUsedMs + used);
  const history: HistoryItem = {
    seq: current.seq,
    qid: item.qid,
    choice,
    correct: item.correct,
    outcome,
    ms: Math.round(outcome === 'silent' ? state.questionMs : used),
  };
  state.history.push(history);
  state.cursor += 1;
  state.seq += 1;

  if (outcome === 'sunset' || state.timeUsedMs >= state.runMs) {
    finishInPlace(state, now, 'sunset');
  } else if (state.cursor >= state.deck.length) {
    finishInPlace(state, now, 'deck');
  } else {
    state.current = {
      seq: state.seq,
      deckIndex: state.cursor,
      sentAt: now,
      graceMs: outcome === 'skipped' ? RULES.SKIP_FEEDBACK_MS : RULES.FEEDBACK_MS,
    };
  }

  return {
    state,
    outcome,
    delta,
    thinkMs: Math.round(used),
    choice,
    correctIndex: outcome === 'skipped' ? null : item.correct,
  };
}

function finishInPlace(state: RunState, now: number, reason: OverReason): void {
  state.status = 'done';
  state.current = null;
  state.finishedAt = now;
  state.overReason = reason;
  if (reason === 'sunset') state.timeUsedMs = state.runMs;
}

function result(settled: Settled, skipsLeft: number, lookup: QuestionLookup): AnswerResult {
  const { state } = settled;
  return {
    outcome: settled.outcome,
    delta: settled.delta,
    correctIndex: settled.correctIndex,
    choice: settled.choice,
    thinkMs: settled.thinkMs,
    totals: totalsOf(state),
    timeUsedMs: state.timeUsedMs,
    skipsLeft,
    next: currentQuestion(state, lookup),
    over: state.status === 'done',
    overReason: state.overReason,
  };
}

export function applyAnswer(
  prev: RunState,
  input: { seq: number; choice: number; clientMs: number },
  now: number,
  skipsLeft: number,
  lookup: QuestionLookup,
): { state: RunState; result: AnswerResult } {
  assertLive(prev, input.seq);
  const item = prev.deck[prev.current!.deckIndex];
  if (!Number.isInteger(input.choice) || input.choice < 0 || input.choice >= item.perm.length) {
    throw new GameError('invalid', 'That choice doesn’t exist.');
  }
  const settled = settle(prev, { type: 'answer', choice: input.choice }, acceptedThinkMs(prev, input.clientMs, now), now);
  return { state: settled.state, result: result(settled, skipsLeft, lookup) };
}

/** `skipsLeft` is the player's remaining daily bank; a skip only spends one when it actually happens. */
export function applySkip(
  prev: RunState,
  input: { seq: number; clientMs: number },
  now: number,
  skipsLeft: number,
  lookup: QuestionLookup,
): { state: RunState; result: AnswerResult; skipUsed: boolean } {
  assertLive(prev, input.seq);
  if (skipsLeft <= 0) throw new GameError('no-skips');
  const settled = settle(prev, { type: 'skip' }, acceptedThinkMs(prev, input.clientMs, now), now);
  const skipUsed = settled.outcome === 'skipped';
  return { state: settled.state, result: result(settled, skipUsed ? skipsLeft - 1 : skipsLeft, lookup), skipUsed };
}

export function applyTimeout(
  prev: RunState,
  input: { seq: number },
  now: number,
  skipsLeft: number,
  lookup: QuestionLookup,
): { state: RunState; result: AnswerResult } {
  assertLive(prev, input.seq);
  // An eclipse always costs exactly the question's five seconds, however long the player was
  // away: the run clock stops at the eclipse. If fewer than five seconds of daylight were left,
  // the sun set first and nothing is charged.
  const settled = settle(prev, { type: 'timeout' }, prev.questionMs, now);
  return { state: settled.state, result: result(settled, skipsLeft, lookup) };
}

/** Ends a run. The question on screen (if any) is not scored. Idempotent. */
export function finishRun(prev: RunState, now: number, reason: 'sunset' | 'quit', clientMs?: number): RunState {
  if (prev.status === 'done') return prev;
  const state = clone(prev);
  if (state.current) {
    const item = state.deck[state.current.deckIndex];
    const think = acceptedThinkMs(state, clientMs ?? Number.POSITIVE_INFINITY, now);
    state.timeUsedMs = Math.min(state.runMs, state.timeUsedMs + think);
    state.history.push({ seq: state.current.seq, qid: item.qid, choice: null, correct: item.correct, outcome: 'sunset', ms: Math.round(think) });
  }
  finishInPlace(state, now, reason);
  return state;
}

/**
 * Reconnecting mid-run. If the question on screen has already eclipsed, it is
 * settled as silence and the next one is issued. The server clock never stops.
 */
export function resumeRun(
  prev: RunState,
  now: number,
  skipsLeft: number,
  lookup: QuestionLookup,
): { state: RunState; elapsedMs: number; settled: AnswerResult | null } {
  if (prev.status === 'done' || !prev.current) return { state: prev, elapsedMs: 0, settled: null };
  const elapsed = Math.max(0, now - prev.current.sentAt - prev.current.graceMs);
  if (elapsed <= prev.questionMs + RULES.DEADLINE_GRACE_MS) {
    return { state: prev, elapsedMs: elapsed, settled: null };
  }
  const timedOut = applyTimeout(prev, { seq: prev.current.seq }, now, skipsLeft, lookup);
  return { state: timedOut.state, elapsedMs: 0, settled: timedOut.result };
}

export function currentQuestion(state: RunState, lookup: QuestionLookup): PublicQuestion | null {
  if (state.status !== 'live' || !state.current) return null;
  const item = state.deck[state.current.deckIndex];
  const def = lookup(item.qid);
  if (!def) throw new GameError('invalid', `Unknown question ${item.qid}`);
  return toPublicQuestion(state.current.seq, item, def);
}

export function summarize(state: RunState, lookup: QuestionLookup): RunSummary {
  const totals = totalsOf(state);
  const avgMs = averageMs(totals);
  const review: ReviewItem[] = state.history.map((h) => {
    const def = lookup(h.qid);
    const item = state.deck.find((d) => d.qid === h.qid);
    return {
      seq: h.seq,
      category: def?.cat ?? 'earth',
      text: def?.q ?? '',
      options: def && item ? item.perm.map((i) => def.a[i]) : [],
      correctIndex: h.correct,
      choice: h.choice,
      outcome: h.outcome,
      ms: h.ms,
    };
  });
  return {
    competitionId: state.cid,
    totals,
    avgMs,
    timeUsedMs: state.timeUsedMs,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt ?? state.startedAt,
    rankKey: rankKey({ score: totals.score, answered: totals.answered, avgMs }),
    overReason: state.overReason ?? 'sunset',
    review,
  };
}
