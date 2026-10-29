import type { CategoryId, Difficulty, QuestionDef } from '../types';

/**
 * Authoring rows:
 *   [difficulty, question, [correct, ...wrong]]     multiple choice, shuffled per competition
 *   [difficulty, statement, true | false]            true / false, always shown True · False
 *   ...with an optional trailing fact (practice set only)
 */
export type Row =
  | [Difficulty, string, string[]]
  | [Difficulty, string, boolean]
  | [Difficulty, string, string[], string]
  | [Difficulty, string, boolean, string];

export function build(prefix: string, cat: CategoryId, rows: Row[]): QuestionDef[] {
  return rows.map((row, i) => {
    const [d, q, a, fact] = row;
    const id = `${prefix}${cat}-${String(i + 1).padStart(2, '0')}`;
    const base = typeof a === 'boolean'
      ? { id, cat, d, q, a: ['True', 'False'], c: a ? 0 : 1, fixed: true }
      : { id, cat, d, q, a, c: 0 };
    return fact ? { ...base, fact } : base;
  });
}
