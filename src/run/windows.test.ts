import { describe, expect, it } from 'vitest';
import { RULES } from '@shared/rules';
import { ENTER_MS, EXIT_MS, INTRO_STEP_MS, REVEAL_MS, VISUAL } from './windows';

describe('run transition windows', () => {
  it('add up to exactly what the server allows', () => {
    expect(REVEAL_MS + EXIT_MS + ENTER_MS).toBe(RULES.FEEDBACK_MS);
    expect(EXIT_MS).toBeGreaterThan(0);
    expect(INTRO_STEP_MS * 3).toBe(RULES.INTRO_MS);
    expect(ENTER_MS).toBeLessThan(RULES.SKIP_FEEDBACK_MS);
  });

  it('give every animation room inside its window', () => {
    // All four tiles are in place by the time the question's clock starts.
    expect(3 * VISUAL.tileStagger + VISUAL.tileFade).toBeLessThanOrEqual(ENTER_MS + 10);
    // Feedback reads before the question starts to leave.
    expect(VISUAL.correctPop).toBeLessThanOrEqual(REVEAL_MS);
    expect(VISUAL.wrongShake).toBeLessThanOrEqual(REVEAL_MS);
    // A burst is gone before the next question appears.
    expect(VISUAL.burstMs).toBeLessThan(RULES.FEEDBACK_MS);
  });
});
