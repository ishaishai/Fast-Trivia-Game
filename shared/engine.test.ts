import { describe, expect, it } from 'vitest';
import { buildDeck, buildPracticeDeck, lookupFor } from './deck';
import { GameError } from './errors';
import { BANK } from './questions/bank';
import { PRACTICE } from './questions/practice';
import { compareEntries, rankKey } from './ranking';
import { RULES } from './rules';
import { applyAnswer, applySkip, applyTimeout, createRun, finishRun, resumeRun, summarize } from './run';
import {
  addDays,
  buildDay,
  competitionId,
  ianaZone,
  localZone,
  phaseOf,
  registrationPhase,
} from './schedule';
import type { EntryRow, RunState } from './types';

const lookup = lookupFor([...BANK, ...PRACTICE]);
const CID = competitionId('2026-10-28', 'daily');
const T0 = 1_800_000_000_000;

function freshRun(now = T0): RunState {
  return createRun({ runId: 'r1', uid: 'u1', cid: CID, dayKey: '2026-10-28', deck: buildDeck(CID, BANK), now });
}

/** Time at which the client would answer `thinkMs` into the current question, with a given round trip. */
function answerAt(state: RunState, thinkMs: number, rttMs = 120): number {
  return state.current!.sentAt + state.current!.graceMs + thinkMs + rttMs;
}

const correctChoice = (s: RunState) => s.deck[s.current!.deckIndex].correct;
const wrongChoice = (s: RunState) => (correctChoice(s) + 1) % s.deck[s.current!.deckIndex].perm.length;

describe('scoring', () => {
  it('awards +3 for right, −1 for wrong, −1 for silence, 0 for a skip', () => {
    let s = freshRun();
    let r = applyAnswer(s, { seq: 0, choice: correctChoice(s), clientMs: 900 }, answerAt(s, 900), 24, lookup);
    expect(r.result.outcome).toBe('correct');
    expect(r.result.totals.score).toBe(3);
    s = r.state;

    r = applyAnswer(s, { seq: 1, choice: wrongChoice(s), clientMs: 1200 }, answerAt(s, 1200), 24, lookup);
    expect(r.result.outcome).toBe('wrong');
    expect(r.result.totals.score).toBe(2);
    s = r.state;

    const t = applyTimeout(s, { seq: 2 }, answerAt(s, RULES.QUESTION_MS), 24, lookup);
    expect(t.result.outcome).toBe('silent');
    expect(t.result.totals.score).toBe(1);
    s = t.state;

    const k = applySkip(s, { seq: 3, clientMs: 400 }, answerAt(s, 400), 24, lookup);
    expect(k.result.outcome).toBe('skipped');
    expect(k.skipUsed).toBe(true);
    expect(k.result.skipsLeft).toBe(23);
    expect(k.result.totals.score).toBe(1);
    expect(k.result.correctIndex).toBeNull();
  });

  it('counts answered as right + wrong only', () => {
    let s = freshRun();
    s = applyAnswer(s, { seq: 0, choice: correctChoice(s), clientMs: 800 }, answerAt(s, 800), 24, lookup).state;
    s = applyTimeout(s, { seq: 1 }, answerAt(s, 3000), 24, lookup).state;
    s = applySkip(s, { seq: 2, clientMs: 300 }, answerAt(s, 300), 24, lookup).state;
    expect(s.answered).toBe(1);
    expect(s.silent).toBe(1);
    expect(s.skips).toBe(1);
  });
});

describe('timing and fair play', () => {
  it('measures an honest player by their own clock', () => {
    const s = freshRun();
    const r = applyAnswer(s, { seq: 0, choice: correctChoice(s), clientMs: 1430 }, answerAt(s, 1430, 180), 24, lookup);
    expect(r.result.thinkMs).toBe(1430);
    expect(r.state.timeUsedMs).toBe(1430);
  });

  it('includes the intro grace on the first question', () => {
    const s = freshRun();
    expect(s.current!.graceMs).toBe(RULES.INTRO_MS);
    const r = applyAnswer(s, { seq: 0, choice: correctChoice(s), clientMs: 1000 }, T0 + RULES.INTRO_MS + 1000 + 100, 24, lookup);
    expect(r.result.thinkMs).toBe(1000);
  });

  it('caps what an under-reporting client can gain', () => {
    const s = freshRun();
    // Really took 2.6 s but claims 0.2 s.
    const now = answerAt(s, 2600, 100);
    const r = applyAnswer(s, { seq: 0, choice: correctChoice(s), clientMs: 200 }, now, 24, lookup);
    expect(r.result.thinkMs).toBeGreaterThanOrEqual(2600 + 100 - RULES.RTT_ALLOWANCE_MS);
  });

  it('turns a late answer into silence', () => {
    const s = freshRun();
    const r = applyAnswer(s, { seq: 0, choice: correctChoice(s), clientMs: 3400 }, answerAt(s, 3400, 50), 24, lookup);
    expect(r.result.outcome).toBe('silent');
    expect(r.result.delta).toBe(RULES.POINTS_SILENT);
  });

  it('rejects out-of-order answers', () => {
    const s = freshRun();
    expect(() => applyAnswer(s, { seq: 5, choice: 0, clientMs: 500 }, answerAt(s, 500), 24, lookup)).toThrow(GameError);
  });

  it('ends at sunset and never scores an answer given after it', () => {
    let s = freshRun();
    // Burn 59 seconds with 20 near-deadline correct answers (2.95 s each).
    for (let i = 0; i < 20; i++) {
      s = applyAnswer(s, { seq: s.current!.seq, choice: correctChoice(s), clientMs: 2950 }, answerAt(s, 2950), 24, lookup).state;
    }
    expect(s.timeUsedMs).toBe(59_000);
    expect(s.status).toBe('live');
    const before = s.score;
    const r = applyAnswer(s, { seq: s.current!.seq, choice: correctChoice(s), clientMs: 2500 }, answerAt(s, 2500), 24, lookup);
    expect(r.result.outcome).toBe('sunset');
    expect(r.result.over).toBe(true);
    expect(r.state.score).toBe(before);
    expect(r.state.timeUsedMs).toBe(RULES.RUN_MS);
  });

  it('a timeout that would land after sunset is not punished', () => {
    let s = freshRun();
    for (let i = 0; i < 20; i++) {
      s = applyAnswer(s, { seq: s.current!.seq, choice: correctChoice(s), clientMs: 2900 }, answerAt(s, 2900), 24, lookup).state;
    }
    // 58 s used, 2 s left: an eclipse at 3 s would be after sunset.
    const r = applyTimeout(s, { seq: s.current!.seq }, answerAt(s, 3000), 24, lookup);
    expect(r.result.outcome).toBe('sunset');
    expect(r.state.score).toBe(s.score);
  });
});

describe('skips', () => {
  it('refuses a skip with an empty bank', () => {
    const s = freshRun();
    expect(() => applySkip(s, { seq: 0, clientMs: 300 }, answerAt(s, 300), 0, lookup)).toThrow(/skips/i);
  });

  it('a skip after the eclipse is silence and keeps the skip', () => {
    const s = freshRun();
    const r = applySkip(s, { seq: 0, clientMs: 3500 }, answerAt(s, 3500), 5, lookup);
    expect(r.result.outcome).toBe('silent');
    expect(r.skipUsed).toBe(false);
    expect(r.result.skipsLeft).toBe(5);
  });

  it('gives the next question a shorter transition', () => {
    const s = freshRun();
    const r = applySkip(s, { seq: 0, clientMs: 300 }, answerAt(s, 300), 5, lookup);
    expect(r.state.current!.graceMs).toBe(RULES.SKIP_FEEDBACK_MS);
  });
});

describe('finishing and resuming', () => {
  it('does not score the question on screen when the run ends', () => {
    const s = freshRun();
    const done = finishRun(s, answerAt(s, 1000), 'quit', 1000);
    expect(done.status).toBe('done');
    expect(done.score).toBe(0);
    expect(done.history[0].outcome).toBe('sunset');
    expect(finishRun(done, T0 + 99_999, 'sunset')).toBe(done);
  });

  it('settles an eclipsed question as silence on resume', () => {
    const s = freshRun();
    const r = resumeRun(s, s.current!.sentAt + s.current!.graceMs + 8000, 24, lookup);
    expect(r.settled?.outcome).toBe('silent');
    expect(r.state.seq).toBe(1);
  });

  it('a long absence costs one eclipse, not the whole run', () => {
    let s = freshRun();
    for (let i = 0; i < 17; i++) {
      s = applyAnswer(s, { seq: s.current!.seq, choice: correctChoice(s), clientMs: 3000 }, answerAt(s, 3000), 24, lookup).state;
    }
    // 51 s used, 9 s of daylight left; the player disappears for ten minutes.
    const r = resumeRun(s, s.current!.sentAt + 10 * 60_000, 24, lookup);
    expect(r.settled?.outcome).toBe('silent');
    expect(r.state.status).toBe('live');
    expect(r.state.timeUsedMs).toBe(54_000);
  });

  it('resumes a live question with its elapsed time', () => {
    const s = freshRun();
    const r = resumeRun(s, s.current!.sentAt + s.current!.graceMs + 1200, 24, lookup);
    expect(r.settled).toBeNull();
    expect(r.elapsedMs).toBe(1200);
  });

  it('summarises with a review of every question seen', () => {
    let s = freshRun();
    s = applyAnswer(s, { seq: 0, choice: correctChoice(s), clientMs: 800 }, answerAt(s, 800), 24, lookup).state;
    s = finishRun(s, answerAt(s, 500), 'sunset', 500);
    const summary = summarize(s, lookup);
    expect(summary.review).toHaveLength(2);
    expect(summary.review[0].text.length).toBeGreaterThan(5);
    expect(summary.totals.score).toBe(3);
  });
});

describe('decks', () => {
  it('is identical for every player and every call', () => {
    expect(buildDeck(CID, BANK)).toEqual(buildDeck(CID, BANK));
  });

  it('never repeats a question across the four competitions of a day', () => {
    const ids = buildDay('2026-10-28', localZone).flatMap((c) => buildDeck(c.id, BANK).map((d) => d.qid));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(RULES.DECK_SIZE * 4);
  });

  it('opens with warm-ups and keeps true/false in order', () => {
    const deck = buildDeck(CID, BANK);
    for (const item of deck.slice(0, RULES.EASY_OPENERS)) expect(lookup(item.qid)!.d).toBe(1);
    for (const item of deck) {
      const def = lookup(item.qid)!;
      if (def.fixed) expect(item.perm).toEqual([0, 1]);
      expect(item.perm[item.correct]).toBe(def.c);
    }
  });

  it('builds different decks on different days', () => {
    const a = buildDeck(competitionId('2026-10-28', 'daily'), BANK).map((d) => d.qid);
    const b = buildDeck(competitionId('2026-10-29', 'daily'), BANK).map((d) => d.qid);
    expect(a).not.toEqual(b);
  });

  it('shuffles practice decks', () => {
    expect(buildPracticeDeck(1, PRACTICE)).toHaveLength(PRACTICE.length);
  });
});

describe('ranking', () => {
  const row = (uid: string, score: number, answered: number, avgMs: number, finishedAt = 0): EntryRow => ({
    uid, handle: uid, city: '', avatarSeed: 0, score, answered, correct: 0, wrong: 0, silent: 0, skips: 0, avgMs,
    status: 'done', rankKey: rankKey({ score, answered, avgMs }), startedAt: 0, finishedAt,
  });

  it('orders by points, then answered, then speed, then finish time', () => {
    const rows = [
      row('slow', 40, 20, 1800),
      row('fast', 40, 20, 1200),
      row('more', 40, 22, 2000),
      row('top', 41, 10, 2500),
      row('late', 40, 20, 1200, 50),
    ];
    rows.sort(compareEntries);
    expect(rows.map((r) => r.uid)).toEqual(['top', 'more', 'fast', 'late', 'slow']);
  });

  it('handles negative scores', () => {
    expect(rankKey({ score: -5, answered: 3, avgMs: 900 })).toBeLessThan(rankKey({ score: 0, answered: 0, avgMs: 0 }));
  });
});

describe('schedule', () => {
  it('builds four competitions with the right windows', () => {
    const day = buildDay('2026-10-28', localZone);
    expect(day.map((c) => c.kind)).toEqual(['daily', 'firstlight', 'zenith', 'bluehour']);
    const daily = day[0];
    expect(daily.closesAt - daily.opensAt).toBe(24 * 3600_000);
    expect(daily.regOpensAt).toBeNull();
    const blue = day[3];
    expect(new Date(blue.opensAt).getHours()).toBe(20);
    expect(blue.closesAt - blue.opensAt).toBe(3600_000);
    expect(blue.regClosesAt).toBe(blue.opensAt);
    expect(blue.opensAt - blue.regOpensAt!).toBe(RULES.REGISTRATION_LEAD_MS);
  });

  it('moves through phases at the boundaries', () => {
    const c = buildDay('2026-10-28', localZone)[1];
    expect(phaseOf(c, c.opensAt - 1)).toBe('upcoming');
    expect(phaseOf(c, c.opensAt)).toBe('open');
    expect(phaseOf(c, c.closesAt)).toBe('closing');
    expect(phaseOf(c, c.crownAt)).toBe('final');
    expect(registrationPhase(c, c.regOpensAt! - 1)).toBe('not-yet');
    expect(registrationPhase(c, c.regOpensAt!)).toBe('open');
    expect(registrationPhase(c, c.opensAt)).toBe('closed');
  });

  it('resolves IANA zones', () => {
    const utc = ianaZone('UTC');
    expect(utc.toEpoch('2026-10-28', 8 * 60)).toBe(Date.UTC(2026, 9, 28, 8, 0));
    expect(utc.dayKeyOf(Date.UTC(2026, 9, 28, 23, 59))).toBe('2026-10-28');
    const tokyo = ianaZone('Asia/Tokyo');
    expect(tokyo.toEpoch('2026-10-28', 8 * 60)).toBe(Date.UTC(2026, 9, 27, 23, 0));
  });

  it('adds days across month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('question bank', () => {
  it('has enough questions for four disjoint decks a day', () => {
    expect(BANK.length).toBeGreaterThanOrEqual(RULES.DECK_SIZE * 4);
  });

  it('is well-formed and readable in three seconds', () => {
    const ids = new Set<string>();
    for (const q of [...BANK, ...PRACTICE]) {
      expect(ids.has(q.id), q.id).toBe(false);
      ids.add(q.id);
      expect(q.a.length, q.q).toBeGreaterThanOrEqual(2);
      expect(q.a.length, q.q).toBeLessThanOrEqual(4);
      expect(q.c).toBeGreaterThanOrEqual(0);
      expect(q.c).toBeLessThan(q.a.length);
      expect(q.q.length, q.q).toBeLessThanOrEqual(80);
      expect(new Set(q.a.map((a) => a.toLowerCase())).size, q.q).toBe(q.a.length);
      for (const a of q.a) expect(a.length, a).toBeLessThanOrEqual(24);
    }
  });

  it('gives every practice question a fact and keeps it out of competitions', () => {
    for (const q of PRACTICE) expect(q.fact).toBeTruthy();
    const competitive = new Set(BANK.map((q) => q.q));
    for (const q of PRACTICE) expect(competitive.has(q.q), q.q).toBe(false);
  });

  it('mixes 2, 3 and 4 choice questions', () => {
    const counts = [2, 3, 4].map((n) => BANK.filter((q) => q.a.length === n).length);
    for (const c of counts) expect(c).toBeGreaterThan(30);
  });
});
