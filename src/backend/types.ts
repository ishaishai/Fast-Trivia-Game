import type {
  AnswerResult,
  ChampionRecord,
  Competition,
  EntryRow,
  PlayerStats,
  Profile,
  RunStart,
  RunSummary,
} from '@shared/types';

export type Unsubscribe = () => void;

/** My entry in a competition, as far as the day view needs it. */
export interface PlayedSummary {
  competitionId: string;
  status: 'live' | 'done';
  score: number;
  answered: number;
  correct: number;
  wrong: number;
  silent: number;
  skips: number;
  avgMs: number;
  finishedAt: number | null;
}

export interface DayView {
  dayKey: string;
  /** Today's four competitions, in schedule order. */
  competitions: Competition[];
  /** Tomorrow's sessions (registration may already be open). */
  tomorrow: Competition[];
  skipsUsed: number;
  skipsLeft: number;
  registered: string[];
  played: Record<string, PlayedSummary>;
  activeRun: { runId: string; competitionId: string } | null;
  /** Players mid-run right now, across every open competition. */
  liveNow: number;
}

export interface LeaderboardView {
  competitionId: string;
  rows: EntryRow[];
  me: EntryRow | null;
  myRank: number | null;
  total: number;
  live: number;
  updatedAt: number;
}

export interface WireEvent {
  id: string;
  at: number;
  handle: string;
  city: string;
  score: number;
  competitionId: string;
}

export interface UpcomingEvent {
  competition: Competition;
  at: number;
}

/** Offline-only tools for reviewing the game at any time of day. */
export interface PreviewControls {
  warpOffset(): number;
  warpBy(ms: number): void;
  warpTo(epoch: number): void;
  resetWarp(): void;
  nextOpening(): UpcomingEvent | null;
  nextCrowning(): UpcomingEvent | null;
  resetToday(): Promise<void>;
  resetAll(): Promise<void>;
}

export interface GameBackend {
  readonly kind: 'mock' | 'firebase';
  /** Shown in settings and the footer. */
  readonly label: string;
  init(): Promise<void>;
  /** Server time. Always use this, never Date.now(). */
  now(): number;
  dayKeyAt(epoch: number): string;
  onClockChange(listener: () => void): Unsubscribe;

  getProfile(): Promise<Profile | null>;
  saveProfile(input: { handle: string; city: string }): Promise<Profile>;

  subscribeDay(listener: (day: DayView) => void): Unsubscribe;
  getCompetition(competitionId: string): Promise<Competition | null>;
  register(competitionId: string): Promise<void>;
  unregister(competitionId: string): Promise<void>;

  startRun(competitionId: string): Promise<RunStart>;
  resumeRun(competitionId: string): Promise<RunStart | null>;
  answer(runId: string, input: { seq: number; choice: number; clientMs: number }): Promise<AnswerResult>;
  skip(runId: string, input: { seq: number; clientMs: number }): Promise<AnswerResult>;
  timeout(runId: string, input: { seq: number }): Promise<AnswerResult>;
  finish(runId: string, input: { reason: 'sunset' | 'quit'; clientMs?: number }): Promise<RunSummary>;
  getResult(competitionId: string): Promise<RunSummary | null>;

  subscribeLeaderboard(
    competitionId: string,
    listener: (board: LeaderboardView) => void,
    options?: { limit?: number },
  ): Unsubscribe;
  subscribeWire(listener: (events: WireEvent[]) => void): Unsubscribe;
  getChampions(days: number): Promise<ChampionRecord[]>;
  getStats(): Promise<PlayerStats>;

  preview?: PreviewControls;
}
