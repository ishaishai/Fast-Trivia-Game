import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { cancelAnimation, Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { ERROR_COPY, isGameError, type GameErrorCode } from '@shared/errors';
import { RULES } from '@shared/rules';
import { emptyTotals } from '@shared/run';
import type { AnswerResult, Outcome, PublicQuestion, RunStart, RunSummary, RunTotals } from '@shared/types';
import { haptic } from '@/audio/haptics';
import { play, preloadSounds } from '@/audio/sound';
import { sleep } from '@/lib/emitter';
import type { RunSource } from './sources';
import { ENTER_MS, REVEAL_MS } from './windows';

/**
 * ready → starting → intro → live ⇄ (pending → reveal → exit → enter) → sunset
 *
 * The client keeps its own clock for the player's thinking time and plays a
 * transition of exactly the length the server allows for (INTRO / FEEDBACK /
 * SKIP_FEEDBACK), so the two clocks agree to within network latency.
 */
export type RunPhase = 'ready' | 'starting' | 'intro' | 'live' | 'pending' | 'reveal' | 'exit' | 'enter' | 'sunset' | 'error';

export interface Feedback {
  outcome: Outcome | 'pending';
  choice: number | null;
  correctIndex: number | null;
  delta: number;
  skip?: boolean;
}

export interface RunView {
  phase: RunPhase;
  question: PublicQuestion | null;
  questionKey: number;
  feedback: Feedback | null;
  totals: RunTotals;
  skipsLeft: number;
  timeUsedMs: number;
  runMs: number;
  questionMs: number;
  syncing: boolean;
  reconnecting: boolean;
  error: string | null;
  errorCode: GameErrorCode | null;
  resumed: boolean;
  lastDelta: { value: number; key: number } | null;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const initialView = (skipsLeft: number): RunView => ({
  phase: 'ready',
  question: null,
  questionKey: 0,
  feedback: null,
  totals: emptyTotals(),
  skipsLeft,
  timeUsedMs: 0,
  runMs: RULES.RUN_MS,
  questionMs: RULES.QUESTION_MS,
  syncing: false,
  reconnecting: false,
  error: null,
  errorCode: null,
  resumed: false,
  lastDelta: null,
});

export function useRunController(source: RunSource, opts: { skipsLeft: number; onDone: (summary: RunSummary) => void }) {
  const [view, setView] = useState<RunView>(() => initialView(opts.skipsLeft));
  /** 0 → 1 over the question's three seconds. */
  const eclipse = useSharedValue(0);
  /** 0 → 1 over the run's sixty seconds: sunrise to midnight. */
  const day = useSharedValue(0);
  /** 0 → 1 as the sun sets at the end. */
  const dusk = useSharedValue(0);

  const s = useRef({
    phase: 'ready' as RunPhase,
    runId: null as string | null,
    seq: 0,
    shownAt: 0,
    elapsedBase: 0,
    timeUsed: 0,
    runMs: RULES.RUN_MS as number,
    questionMs: RULES.QUESTION_MS as number,
    timers: [] as ReturnType<typeof setTimeout>[],
    mounted: true,
    deltaKey: 0,
  });
  const onDone = useRef(opts.onDone);
  onDone.current = opts.onDone;

  const setPhase = useCallback((phase: RunPhase, patch: Partial<RunView> = {}) => {
    s.current.phase = phase;
    setView((v) => ({ ...v, ...patch, phase }));
  }, []);

  const later = useCallback((ms: number, fn: () => void) => {
    const t = setTimeout(() => {
      if (s.current.mounted) fn();
    }, ms);
    s.current.timers.push(t);
  }, []);

  const clearTimers = useCallback(() => {
    s.current.timers.forEach(clearTimeout);
    s.current.timers = [];
  }, []);

  useEffect(() => {
    preloadSounds();
    const ref = s.current;
    return () => {
      ref.mounted = false;
      ref.timers.forEach(clearTimeout);
    };
  }, []);

  /** Thinking time on the current question, by this device's clock. */
  const thinkMs = useCallback(() => Math.round(now() - s.current.shownAt + s.current.elapsedBase), []);

  const freeze = useCallback(() => {
    clearTimers();
    cancelAnimation(eclipse);
    cancelAnimation(day);
  }, [clearTimers, day, eclipse]);

  const fail = useCallback(
    (error: unknown) => {
      freeze();
      const code = isGameError(error) ? error.code : null;
      setPhase('error', {
        error: isGameError(error) ? error.message : ERROR_COPY.unavailable,
        errorCode: code,
        syncing: false,
        reconnecting: false,
      });
    },
    [freeze, setPhase],
  );

  /** Network calls retry quietly, then visibly; game rule errors surface at once. */
  const call = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    let attempt = 0;
    for (;;) {
      try {
        const out = await fn();
        if (attempt > 2) setView((v) => ({ ...v, reconnecting: false }));
        return out;
      } catch (error) {
        if (isGameError(error) || !s.current.mounted) throw error;
        attempt += 1;
        if (attempt > 2) setView((v) => ({ ...v, reconnecting: true }));
        await sleep(Math.min(2500, 300 * attempt));
      }
    }
  }, []);

  // ------------------------------------------------------------- endings --

  const finishWith = useCallback(
    async (reason: 'sunset' | 'quit', clientMs?: number) => {
      const runId = s.current.runId;
      if (!runId || s.current.phase === 'sunset') return;
      freeze();
      setPhase('sunset', { syncing: false });
      play('sunset');
      haptic('heavy');
      dusk.value = withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) });
      day.value = withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) });
      try {
        const [summary] = await Promise.all([call(() => source.finish(runId, { reason, clientMs })), sleep(1500)]);
        if (s.current.mounted) onDone.current(summary);
      } catch (error) {
        fail(error);
      }
    },
    [call, day, dusk, fail, freeze, setPhase, source],
  );

  // ---------------------------------------------------------- live phase --

  const goLive = useCallback(
    (question: PublicQuestion, elapsed = 0) => {
      const st = s.current;
      st.seq = question.seq;
      st.shownAt = now();
      st.elapsedBase = elapsed;
      setPhase('live', { question, feedback: null, syncing: false });

      const questionLeft = Math.max(0, st.questionMs - elapsed);
      const runLeft = Math.max(0, st.runMs - st.timeUsed - elapsed);
      eclipse.value = elapsed / st.questionMs;
      eclipse.value = withTiming(1, { duration: questionLeft, easing: Easing.linear });
      day.value = (st.timeUsed + elapsed) / st.runMs;
      day.value = withTiming(1, { duration: runLeft, easing: Easing.linear });

      if (runLeft <= questionLeft) {
        later(runLeft, () => {
          if (s.current.phase === 'live') void finishWith('sunset', thinkMs());
        });
      } else {
        later(questionLeft, () => {
          if (s.current.phase === 'live') void onEclipse();
        });
        if (questionLeft > 1000) {
          later(questionLeft - 1000, () => {
            if (s.current.phase === 'live') {
              play('tick');
              haptic('light');
            }
          });
        }
      }
    },
    // onEclipse is declared below; it is stable (useCallback with stable deps).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [day, eclipse, finishWith, later, setPhase, thinkMs],
  );

  /** Reveal → exit → next question enters → live, inside the server's allowance. */
  const applyResult = useCallback(
    (res: AnswerResult) => {
      const st = s.current;
      st.timeUsed = res.timeUsedMs;
      day.value = withTiming(res.timeUsedMs / st.runMs, { duration: 160 });
      st.deltaKey += 1;
      const skip = res.outcome === 'skipped';
      setPhase('reveal', {
        feedback: { outcome: res.outcome, choice: res.choice, correctIndex: res.correctIndex, delta: res.delta, skip },
        totals: res.totals,
        skipsLeft: res.skipsLeft,
        timeUsedMs: res.timeUsedMs,
        syncing: false,
        lastDelta: res.outcome === 'skipped' || res.outcome === 'sunset' ? null : { value: res.delta, key: st.deltaKey },
      });

      if (res.outcome === 'correct') {
        play('correct');
        haptic('success');
        eclipse.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
        AccessibilityInfo.announceForAccessibility('Right. Plus 3.');
      } else if (res.outcome === 'wrong') {
        play('wrong');
        haptic('error');
        AccessibilityInfo.announceForAccessibility('Wrong. Minus 1.');
      } else if (res.outcome === 'silent') {
        play('silent');
        haptic('warning');
        AccessibilityInfo.announceForAccessibility('Eclipsed. Minus 1.');
      } else if (skip) {
        play('skip');
        eclipse.value = withTiming(0, { duration: 260 });
      }

      if (res.over || !res.next) {
        later(skip ? RULES.SKIP_FEEDBACK_MS : REVEAL_MS + 200, () => void finishWith('sunset'));
        return;
      }
      const next = res.next;
      const total = skip ? RULES.SKIP_FEEDBACK_MS : RULES.FEEDBACK_MS;
      const exitAt = skip ? 0 : REVEAL_MS;
      later(exitAt, () => setPhase('exit'));
      later(total - ENTER_MS, () => {
        eclipse.value = withTiming(0, { duration: ENTER_MS });
        setPhase('enter', { question: next, feedback: null, questionKey: next.seq + 1 });
      });
      later(total, () => goLive(next));
    },
    [day, eclipse, finishWith, goLive, later, setPhase],
  );

  const send = useCallback(
    async (work: () => Promise<AnswerResult>, pending: Feedback) => {
      freeze();
      setPhase('pending', { feedback: pending });
      const slow = setTimeout(() => setView((v) => (v.phase === 'pending' ? { ...v, syncing: true } : v)), 450);
      try {
        const res = await call(work);
        clearTimeout(slow);
        // A quit can land while an answer is in flight; the quit wins.
        if (s.current.mounted && s.current.phase === 'pending') applyResult(res);
      } catch (error) {
        clearTimeout(slow);
        if (isGameError(error) && error.code === 'bad-seq') {
          await resync();
          return;
        }
        if (isGameError(error) && error.code === 'run-over') {
          await finishWith('sunset');
          return;
        }
        fail(error);
      }
    },
    // resync is declared below and stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyResult, call, fail, finishWith, freeze, setPhase],
  );

  const onEclipse = useCallback(() => {
    const st = s.current;
    if (!st.runId) return;
    const runId = st.runId;
    const seq = st.seq;
    void send(() => source.timeout(runId, { seq }), { outcome: 'pending', choice: null, correctIndex: null, delta: 0 });
  }, [send, source]);

  // -------------------------------------------------------------- start --

  const begin = useCallback(
    (start: RunStart) => {
      const st = s.current;
      st.runId = start.runId;
      st.timeUsed = start.timeUsedMs;
      st.runMs = start.runMs;
      st.questionMs = start.questionMs;
      setView((v) => ({
        ...v,
        totals: start.totals,
        skipsLeft: start.skipsLeft,
        timeUsedMs: start.timeUsedMs,
        runMs: start.runMs,
        questionMs: start.questionMs,
        resumed: start.resumed,
      }));
      day.value = start.timeUsedMs / start.runMs;
      if (start.resumed) {
        // Back on the question that was on screen. Its clock kept running.
        setPhase('enter', { question: start.question, questionKey: start.question.seq + 1 });
        const wait = start.questionElapsedMs > 0 ? ENTER_MS : start.graceMs;
        later(wait, () => goLive(start.question, start.questionElapsedMs));
        return;
      }
      play('sunrise');
      setPhase('intro', { question: start.question, questionKey: start.question.seq + 1 });
      later(RULES.INTRO_MS - ENTER_MS, () => setPhase('enter'));
      later(RULES.INTRO_MS, () => goLive(start.question));
    },
    [day, goLive, later, setPhase],
  );

  const resync = useCallback(async () => {
    try {
      const resumed = await call(() => source.resume());
      if (!resumed) {
        await finishWith('sunset');
        return;
      }
      begin(resumed);
    } catch (error) {
      fail(error);
    }
  }, [begin, call, fail, finishWith, source]);

  const start = useCallback(async () => {
    if (s.current.phase !== 'ready') return;
    setPhase('starting');
    try {
      begin(await call(() => source.start()));
    } catch (error) {
      fail(error);
    }
  }, [begin, call, fail, setPhase, source]);

  /** Pick up a run that was interrupted (reload, lost connection). */
  const resume = useCallback(async (): Promise<boolean> => {
    try {
      const resumed = await call(() => source.resume());
      if (!resumed) return false;
      begin(resumed);
      return true;
    } catch {
      return false;
    }
  }, [begin, call, source]);

  // ------------------------------------------------------------ actions --

  const answer = useCallback(
    (choice: number) => {
      const st = s.current;
      if (st.phase !== 'live' || !st.runId) return;
      const runId = st.runId;
      const input = { seq: st.seq, choice, clientMs: thinkMs() };
      haptic('select');
      void send(() => source.answer(runId, input), { outcome: 'pending', choice, correctIndex: null, delta: 0 });
    },
    [send, source, thinkMs],
  );

  const skip = useCallback(() => {
    const st = s.current;
    if (st.phase !== 'live' || !st.runId) return;
    const runId = st.runId;
    const input = { seq: st.seq, clientMs: thinkMs() };
    void send(() => source.skip(runId, input), { outcome: 'pending', choice: null, correctIndex: null, delta: 0, skip: true });
  }, [send, source, thinkMs]);

  const quit = useCallback(() => {
    const st = s.current;
    if (!st.runId || st.phase === 'sunset') return;
    void finishWith('quit', st.phase === 'live' ? thinkMs() : 0);
  }, [finishWith, thinkMs]);

  /** Seconds of daylight left, by this device's clock. */
  const runLeftMs = useCallback(() => {
    const st = s.current;
    const live = st.phase === 'live' ? now() - st.shownAt + st.elapsedBase : 0;
    return Math.max(0, st.runMs - st.timeUsed - live);
  }, []);

  return { view, eclipse, day, dusk, start, resume, answer, skip, quit, runLeftMs };
}
