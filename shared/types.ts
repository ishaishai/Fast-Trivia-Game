export type CompetitionKind = 'daily' | 'firstlight' | 'zenith' | 'bluehour';
export type LightState = 'firstlight' | 'zenith' | 'bluehour' | 'midnight';
export type CategoryId =
  | 'earth'
  | 'science'
  | 'orbit'
  | 'past'
  | 'canvas'
  | 'sound'
  | 'screen'
  | 'words'
  | 'wild'
  | 'play'
  | 'taste'
  | 'code';
export type Difficulty = 1 | 2 | 3;

/** A question as authored. `a[c]` is the correct choice. */
export interface QuestionDef {
  id: string;
  cat: CategoryId;
  d: Difficulty;
  q: string;
  a: string[];
  c: number;
  /** Keep the authored order on screen (true / false). */
  fixed?: boolean;
  /** Practice only: a one-line fact shown after answering. */
  fact?: string;
}

/** One question in a competition deck: display order of the choices and where the right one landed. */
export interface DeckItem {
  qid: string;
  /** perm[displayIndex] = index into QuestionDef.a */
  perm: number[];
  /** display index of the correct choice */
  correct: number;
}

/** What a client is allowed to see before answering. */
export interface PublicQuestion {
  seq: number;
  qid: string;
  category: CategoryId;
  text: string;
  options: string[];
  trueFalse: boolean;
}

export interface SessionDef {
  kind: CompetitionKind;
  title: string;
  eyebrow: string;
  blurb: string;
  /** minutes from local midnight */
  start: number;
  end: number;
  /** 'live' follows the clock (The Daily). */
  light: LightState | 'live';
  registration: boolean;
}

export interface ChampionSummary {
  uid: string;
  handle: string;
  city: string;
  avatarSeed: number;
  score: number;
  answered: number;
}

export interface Competition {
  id: string;
  kind: CompetitionKind;
  dayKey: string;
  opensAt: number;
  closesAt: number;
  crownAt: number;
  regOpensAt: number | null;
  regClosesAt: number | null;
  runMs: number;
  questionMs: number;
  deckSize: number;
  registeredCount: number;
  playersCount: number;
  liveCount: number;
  champion: ChampionSummary | null;
}

export type CompetitionPhase = 'upcoming' | 'open' | 'closing' | 'final';
export type RegistrationPhase = 'none' | 'not-yet' | 'open' | 'closed';

export type Outcome = 'correct' | 'wrong' | 'silent' | 'skipped' | 'sunset';
export type OverReason = 'sunset' | 'deck' | 'quit';

export interface RunTotals {
  score: number;
  correct: number;
  wrong: number;
  silent: number;
  skips: number;
  /** correct + wrong: questions you actually answered */
  answered: number;
  streak: number;
  bestStreak: number;
  /** summed thinking time of answered questions */
  answerMs: number;
}

export interface HistoryItem {
  seq: number;
  qid: string;
  choice: number | null;
  correct: number;
  outcome: Outcome;
  ms: number;
}

export interface IssuedQuestion {
  seq: number;
  deckIndex: number;
  /** server time the question left the server */
  sentAt: number;
  /** time the client legitimately spends before the question is on screen */
  graceMs: number;
}

export interface RunState extends RunTotals {
  runId: string;
  uid: string;
  cid: string;
  dayKey: string;
  deck: DeckItem[];
  cursor: number;
  seq: number;
  current: IssuedQuestion | null;
  timeUsedMs: number;
  runMs: number;
  questionMs: number;
  history: HistoryItem[];
  status: 'live' | 'done';
  overReason: OverReason | null;
  startedAt: number;
  finishedAt: number | null;
}

export interface RunStart {
  runId: string;
  competitionId: string;
  question: PublicQuestion;
  /** > 0 when resuming a question that was already on screen */
  questionElapsedMs: number;
  graceMs: number;
  totals: RunTotals;
  timeUsedMs: number;
  runMs: number;
  questionMs: number;
  skipsLeft: number;
  resumed: boolean;
  serverNow: number;
}

export interface AnswerResult {
  outcome: Outcome;
  delta: number;
  /** null for skips: skipping never reveals the answer */
  correctIndex: number | null;
  choice: number | null;
  thinkMs: number;
  totals: RunTotals;
  timeUsedMs: number;
  skipsLeft: number;
  next: PublicQuestion | null;
  over: boolean;
  overReason: OverReason | null;
}

export interface ReviewItem {
  seq: number;
  category: CategoryId;
  text: string;
  options: string[];
  correctIndex: number;
  choice: number | null;
  outcome: Outcome;
  ms: number;
}

export interface RunSummary {
  competitionId: string;
  totals: RunTotals;
  avgMs: number;
  timeUsedMs: number;
  startedAt: number;
  finishedAt: number;
  rankKey: number;
  overReason: OverReason;
  review: ReviewItem[];
}

export interface EntryRow {
  uid: string;
  handle: string;
  city: string;
  avatarSeed: number;
  score: number;
  answered: number;
  correct: number;
  wrong: number;
  silent: number;
  skips: number;
  avgMs: number;
  status: 'live' | 'done';
  rankKey: number;
  startedAt: number;
  finishedAt: number | null;
  regular?: boolean;
}

export interface Profile {
  uid: string;
  handle: string;
  city: string;
  avatarSeed: number;
  createdAt: number;
}

export interface PlayerStats {
  runs: number;
  correct: number;
  wrong: number;
  silent: number;
  skips: number;
  answerMs: number;
  answered: number;
  bestScore: number | null;
  crowns: number;
}

export interface ChampionRecord extends ChampionSummary {
  competitionId: string;
  kind: CompetitionKind;
  dayKey: string;
  closesAt: number;
  players: number;
}
