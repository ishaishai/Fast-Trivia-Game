/**
 * The rules of Meridian — the single source of truth for the app, the offline
 * mock server and the Cloud Functions.
 */
export const RULES = {
  /** A run is sixty seconds of answering: sunrise to sunset. */
  RUN_MS: 60_000,
  /** Every question gives you three seconds. */
  QUESTION_MS: 3_000,
  /** Practice can be relaxed for accessibility. Never used in ranked play. */
  RELAXED_QUESTION_MS: 6_000,
  /** Skips per day — one for every hour — shared across every competition. */
  SKIPS_PER_DAY: 24,

  POINTS_CORRECT: 3,
  POINTS_WRONG: -1,
  /** Silence counts as wrong, so letting a question eclipse is never a free skip. */
  POINTS_SILENT: -1,
  POINTS_SKIP: 0,

  /** Questions in every competition deck — the same deck, in the same order, for everyone. */
  DECK_SIZE: 80,
  /** The first questions of every deck are warm-ups. */
  EASY_OPENERS: 8,

  /** Sunrise countdown before the first question (3 · 2 · 1). */
  INTRO_MS: 2_400,
  /** Reveal (320) + exit (100) + entrance (180) between questions. The run clock is paused. */
  FEEDBACK_MS: 600,
  /** A skip has a shorter transition. */
  SKIP_FEEDBACK_MS: 300,
  /** Network round trip the server forgives before it trusts its own clock over the client's. */
  RTT_ALLOWANCE_MS: 900,
  /** Tolerance on the three-second deadline. */
  DEADLINE_GRACE_MS: 150,
  /** Tolerance on the sixty-second sunset. */
  SUNSET_GRACE_MS: 150,

  /** Runs that started before a competition closes may finish within this window. */
  CROWN_GRACE_MS: 120_000,
  /** Registration for a session opens this long before its doors. */
  REGISTRATION_LEAD_MS: 24 * 60 * 60 * 1000,
} as const;

export type Rules = typeof RULES;
