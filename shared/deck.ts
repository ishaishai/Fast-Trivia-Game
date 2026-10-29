import { hashString, mulberry32, shuffle } from './random';
import { RULES } from './rules';
import { KINDS, parseCompetitionId } from './schedule';
import type { DeckItem, PublicQuestion, QuestionDef } from './types';

export type QuestionLookup = (qid: string) => QuestionDef | undefined;

export function lookupFor(bank: readonly QuestionDef[]): QuestionLookup {
  const byId = new Map(bank.map((q) => [q.id, q] as const));
  return (qid) => byId.get(qid);
}

function deckItem(seedKey: string, q: QuestionDef): DeckItem {
  const identity = q.a.map((_, i) => i);
  const perm = q.fixed ? identity : shuffle(identity, mulberry32(hashString(`${seedKey}:${q.id}`)));
  return { qid: q.id, perm, correct: perm.indexOf(q.c) };
}

/**
 * The deck for a competition. Deterministic from the competition id, so every
 * player — and every server instance — gets the same questions in the same
 * order with the same choice order. The four competitions of a day take
 * consecutive, non-overlapping slices of that day's shuffle of the bank.
 */
export function buildDeck(competitionId: string, bank: readonly QuestionDef[], size: number = RULES.DECK_SIZE): DeckItem[] {
  const parsed = parseCompetitionId(competitionId);
  if (!parsed) throw new Error(`Bad competition id: ${competitionId}`);
  const slot = KINDS.indexOf(parsed.kind);
  const ordered = [...bank].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const day = shuffle(ordered, mulberry32(hashString(`meridian:day:${parsed.dayKey}`)));
  const picked: QuestionDef[] = [];
  for (let i = 0; i < size && day.length > 0; i++) picked.push(day[(slot * size + i) % day.length]);
  const openers = picked.filter((q) => q.d === 1).slice(0, RULES.EASY_OPENERS);
  const openerIds = new Set(openers.map((q) => q.id));
  const rest = picked.filter((q) => !openerIds.has(q.id));
  return [...openers, ...rest].map((q) => deckItem(competitionId, q));
}

/** A shuffled practice deck. Not shared between players, so any seed will do. */
export function buildPracticeDeck(seed: number, bank: readonly QuestionDef[]): DeckItem[] {
  const rng = mulberry32(seed);
  return shuffle(bank, rng).map((q) => deckItem(`practice:${seed}`, q));
}

export function toPublicQuestion(seq: number, item: DeckItem, def: QuestionDef): PublicQuestion {
  return {
    seq,
    qid: item.qid,
    category: def.cat,
    text: def.q,
    options: item.perm.map((i) => def.a[i]),
    trueFalse: Boolean(def.fixed),
  };
}
