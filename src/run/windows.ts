import { RULES } from '@shared/rules';

/**
 * The run's transition windows. The server's timing allowance assumes these
 * exact lengths (see shared/run.ts), so every animation on the run screen
 * takes its duration from here and must fit inside its window.
 */

/** After an answer: feedback is on screen this long before the question leaves. */
export const REVEAL_MS = 320;
/** The next question's entrance, ending exactly when its clock starts. */
export const ENTER_MS = 180;
/** What's left of the feedback window for the old question to leave. */
export const EXIT_MS = RULES.FEEDBACK_MS - REVEAL_MS - ENTER_MS;
/** Each step of the 3 · 2 · 1 before the first question. */
export const INTRO_STEP_MS = RULES.INTRO_MS / 3;

/** Animation budgets inside those windows. */
export const VISUAL = {
  /** gap between answer tiles arriving */
  tileStagger: 25,
  /** each tile's fade-in */
  tileFade: 110,
  /** the right answer's pop, start to settle */
  correctPop: 300,
  /** a wrong answer's shake */
  wrongShake: 250,
  /** pixels flying from the right answer to the score */
  burstMs: 520,
} as const;
