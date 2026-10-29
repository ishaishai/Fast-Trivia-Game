import { buildPracticeDeck, lookupFor } from '@shared/deck';
import { GameError } from '@shared/errors';
import { PRACTICE } from '@shared/questions/practice';
import { RULES } from '@shared/rules';
import {
  applyAnswer,
  applySkip,
  applyTimeout,
  createRun,
  currentQuestion,
  finishRun,
  summarize,
  totalsOf,
} from '@shared/run';
import type { AnswerResult, RunStart, RunState, RunSummary } from '@shared/types';
import type { GameBackend } from '@/backend/types';

/** Where a run's answers go: the competition server, or a local practice engine. */
export interface RunSource {
  kind: 'ranked' | 'practice';
  competitionId: string;
  start(): Promise<RunStart>;
  resume(): Promise<RunStart | null>;
  answer(runId: string, input: { seq: number; choice: number; clientMs: number }): Promise<AnswerResult>;
  skip(runId: string, input: { seq: number; clientMs: number }): Promise<AnswerResult>;
  timeout(runId: string, input: { seq: number }): Promise<AnswerResult>;
  finish(runId: string, input: { reason: 'sunset' | 'quit'; clientMs?: number }): Promise<RunSummary>;
}

export function rankedSource(backend: GameBackend, competitionId: string): RunSource {
  return {
    kind: 'ranked',
    competitionId,
    start: () => backend.startRun(competitionId),
    resume: () => backend.resumeRun(competitionId),
    answer: (runId, input) => backend.answer(runId, input),
    skip: (runId, input) => backend.skip(runId, input),
    timeout: (runId, input) => backend.timeout(runId, input),
    finish: (runId, input) => backend.finish(runId, input),
  };
}

const practiceLookup = lookupFor(PRACTICE);

/**
 * Practice runs use the same engine as ranked play, locally, on the public
 * practice set. They never touch the daily skip bank.
 */
export function practiceSource(questionMs: number): RunSource {
  let state: RunState | null = null;
  let skipsLeft: number = RULES.SKIPS_PER_DAY;
  const now = () => Date.now();
  const must = () => {
    if (!state) throw new GameError('run-over');
    return state;
  };
  return {
    kind: 'practice',
    competitionId: 'practice',
    async start() {
      const t = now();
      state = createRun({
        runId: `practice-${t}`,
        uid: 'practice',
        cid: 'practice',
        dayKey: 'practice',
        deck: buildPracticeDeck(t, PRACTICE),
        now: t,
        questionMs,
      });
      skipsLeft = RULES.SKIPS_PER_DAY;
      const question = currentQuestion(state, practiceLookup)!;
      return {
        runId: state.runId,
        competitionId: 'practice',
        question,
        questionElapsedMs: 0,
        graceMs: RULES.INTRO_MS,
        totals: totalsOf(state),
        timeUsedMs: 0,
        runMs: state.runMs,
        questionMs: state.questionMs,
        skipsLeft,
        resumed: false,
        serverNow: t,
      };
    },
    async resume() {
      return null;
    },
    async answer(_runId, input) {
      const out = applyAnswer(must(), input, now(), skipsLeft, practiceLookup);
      state = out.state;
      return out.result;
    },
    async skip(_runId, input) {
      const out = applySkip(must(), input, now(), skipsLeft, practiceLookup);
      if (out.skipUsed) skipsLeft -= 1;
      state = out.state;
      return out.result;
    },
    async timeout(_runId, input) {
      const out = applyTimeout(must(), input, now(), skipsLeft, practiceLookup);
      state = out.state;
      return out.result;
    },
    async finish(_runId, input) {
      state = finishRun(must(), now(), input.reason, input.clientMs);
      return summarize(state, practiceLookup);
    },
  };
}

/** The fact attached to a practice question (shown after you answer). */
export function practiceFact(qid: string): string | undefined {
  return practiceLookup(qid)?.fact;
}
