import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildDeck, lookupFor } from '@shared/deck';
import { GameError } from '@shared/errors';
import { BANK } from '@shared/questions/bank';
import { compareEntries, rankKey } from '@shared/ranking';
import { RULES } from '@shared/rules';
import {
  applyAnswer,
  applySkip,
  applyTimeout,
  createRun,
  currentQuestion,
  finishRun,
  resumeRun,
  summarize,
  totalsOf,
} from '@shared/run';
import {
  KINDS,
  SESSIONS,
  addDays,
  buildCompetition,
  buildDay,
  localZone,
  parseCompetitionId,
  phaseOf,
  registrationPhase,
} from '@shared/schedule';
import type {
  AnswerResult,
  ChampionRecord,
  Competition,
  EntryRow,
  PlayerStats,
  Profile,
  RunStart,
  RunState,
  RunSummary,
  RunTotals,
} from '@shared/types';
import { Emitter, sleep } from '@/lib/emitter';
import { handleProblem, normalizeHandle } from '@/lib/handles';
import type {
  DayView,
  GameBackend,
  LeaderboardView,
  PlayedSummary,
  PreviewControls,
  UpcomingEvent,
  Unsubscribe,
  WireEvent,
} from '../types';
import { REGULARS } from './names';
import { bestRival, countField, fieldFor, rivalRow } from './rivals';

const STORAGE_KEY = 'glint:mock:v1';
const lookup = lookupFor(BANK);
const STALE_RUN_MS = 10 * 60_000;

interface StoredEntry {
  competitionId: string;
  runId: string;
  status: 'live' | 'done';
  startedAt: number;
  finishedAt: number | null;
  totals: RunTotals;
  summary: RunSummary | null;
}

interface MockDb {
  version: 1;
  profile: Profile | null;
  registrations: string[];
  skipsUsed: Record<string, number>;
  entries: Record<string, StoredEntry>;
  runs: Record<string, RunState>;
  warp: number;
}

const emptyDb = (): MockDb => ({
  version: 1,
  profile: null,
  registrations: [],
  skipsUsed: {},
  entries: {},
  runs: {},
  warp: 0,
});

const latency = () => 25 + Math.random() * 35;

/**
 * The offline server. Runs the exact rules engine the Cloud Functions run,
 * simulates network latency, and fills every competition with a
 * deterministic field of rivals so the game feels alive without a backend.
 */
export class MockBackend implements GameBackend {
  readonly kind = 'mock' as const;
  readonly label = 'Offline mock server · this device';

  private db: MockDb = emptyDb();
  private changes = new Emitter();
  private clockChanges = new Emitter();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  readonly preview: PreviewControls = {
    warpOffset: () => this.db.warp,
    warpBy: (ms) => this.setWarp(this.db.warp + ms),
    warpTo: (epoch) => this.setWarp(epoch - Date.now()),
    resetWarp: () => this.setWarp(0),
    nextOpening: () => this.nextEvent('opensAt'),
    nextCrowning: () => this.nextEvent('crownAt'),
    resetToday: async () => {
      const dayKey = this.dayKeyAt(this.now());
      const today = new Set(buildDay(dayKey, localZone).map((c) => c.id));
      for (const id of Object.keys(this.db.entries)) if (today.has(id)) delete this.db.entries[id];
      for (const [runId, run] of Object.entries(this.db.runs)) if (today.has(run.cid)) delete this.db.runs[runId];
      this.db.registrations = this.db.registrations.filter((id) => !today.has(id));
      delete this.db.skipsUsed[dayKey];
      await this.save(true);
      this.changes.emit();
    },
    resetAll: async () => {
      this.db = emptyDb();
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.changes.emit();
      this.clockChanges.emit();
    },
  };

  async init(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) this.db = { ...emptyDb(), ...(JSON.parse(raw) as MockDb) };
    } catch {
      this.db = emptyDb();
    }
    this.prune();
  }

  now(): number {
    return Date.now() + this.db.warp;
  }

  dayKeyAt(epoch: number): string {
    return localZone.dayKeyOf(epoch);
  }

  onClockChange(listener: () => void): Unsubscribe {
    return this.clockChanges.on(listener);
  }

  // ------------------------------------------------------------ profile --

  async getProfile(): Promise<Profile | null> {
    return this.db.profile;
  }

  async saveProfile(input: { handle: string; city: string }): Promise<Profile> {
    await sleep(latency());
    const handle = normalizeHandle(input.handle);
    if (handleProblem(handle)) throw new GameError('invalid', handleProblem(handle) ?? undefined);
    if (REGULARS.some((r) => r.handle === handle)) throw new GameError('handle-taken');
    const city = input.city.trim().slice(0, 24);
    const profile: Profile = this.db.profile
      ? { ...this.db.profile, handle, city }
      : {
          uid: `you-${Math.random().toString(36).slice(2, 10)}`,
          handle,
          city,
          avatarSeed: Math.floor(Math.random() * 1e6),
          createdAt: this.now(),
        };
    this.db.profile = profile;
    await this.save(true);
    this.changes.emit();
    return profile;
  }

  // ---------------------------------------------------------------- day --

  subscribeDay(listener: (day: DayView) => void): Unsubscribe {
    const emit = () => listener(this.dayView());
    emit();
    const timer = setInterval(emit, 1000);
    const off = this.changes.on(emit);
    const offClock = this.clockChanges.on(emit);
    return () => {
      clearInterval(timer);
      off();
      offClock();
    };
  }

  async getCompetition(competitionId: string): Promise<Competition | null> {
    const parsed = parseCompetitionId(competitionId);
    if (!parsed) return null;
    return this.decorate(buildCompetition(parsed.dayKey, parsed.kind, localZone), this.now());
  }

  async register(competitionId: string): Promise<void> {
    await sleep(latency());
    const c = this.mustCompetition(competitionId);
    const phase = registrationPhase(c, this.now());
    if (phase === 'none') throw new GameError('registration-not-required');
    if (phase === 'not-yet') throw new GameError('registration-not-open');
    if (phase === 'closed') throw new GameError('registration-closed');
    if (!this.db.registrations.includes(competitionId)) this.db.registrations.push(competitionId);
    await this.save(true);
    this.changes.emit();
  }

  async unregister(competitionId: string): Promise<void> {
    await sleep(latency());
    const c = this.mustCompetition(competitionId);
    if (registrationPhase(c, this.now()) !== 'open') throw new GameError('registration-closed');
    this.db.registrations = this.db.registrations.filter((id) => id !== competitionId);
    await this.save(true);
    this.changes.emit();
  }

  // ---------------------------------------------------------------- run --

  async startRun(competitionId: string): Promise<RunStart> {
    return this.net(() => {
      const profile = this.mustProfile();
      const c = this.mustCompetition(competitionId);
      const now = this.now();
      const phase = phaseOf(c, now);
      if (phase === 'upcoming') throw new GameError('not-open');
      if (phase !== 'open') throw new GameError('closed');
      if (SESSIONS[c.kind].registration && !this.db.registrations.includes(c.id)) throw new GameError('not-registered');
      if (this.db.entries[c.id]) throw new GameError('already-played');
      const runId = `run-${c.id}-${now.toString(36)}`;
      const state = createRun({ runId, uid: profile.uid, cid: c.id, dayKey: c.dayKey, deck: buildDeck(c.id, BANK), now });
      this.db.runs[runId] = state;
      this.db.entries[c.id] = {
        competitionId: c.id,
        runId,
        status: 'live',
        startedAt: now,
        finishedAt: null,
        totals: totalsOf(state),
        summary: null,
      };
      this.persist();
      return this.runStart(state, now, false, 0);
    });
  }

  async resumeRun(competitionId: string): Promise<RunStart | null> {
    return this.net(() => {
      const entry = this.db.entries[competitionId];
      if (!entry || entry.status !== 'live') return null;
      const state = this.db.runs[entry.runId];
      if (!state) return null;
      const now = this.now();
      const resumed = resumeRun(state, now, this.skipsLeft(state.dayKey), lookup);
      this.commit(resumed.state);
      if (resumed.state.status === 'done') return null;
      return this.runStart(resumed.state, now, true, resumed.elapsedMs);
    });
  }

  async answer(runId: string, input: { seq: number; choice: number; clientMs: number }): Promise<AnswerResult> {
    return this.net(() => {
      const state = this.mustRun(runId);
      const { state: next, result } = applyAnswer(state, input, this.now(), this.skipsLeft(state.dayKey), lookup);
      this.commit(next);
      return result;
    });
  }

  async skip(runId: string, input: { seq: number; clientMs: number }): Promise<AnswerResult> {
    return this.net(() => {
      const state = this.mustRun(runId);
      const out = applySkip(state, input, this.now(), this.skipsLeft(state.dayKey), lookup);
      if (out.skipUsed) this.db.skipsUsed[state.dayKey] = (this.db.skipsUsed[state.dayKey] ?? 0) + 1;
      this.commit(out.state);
      return out.result;
    });
  }

  async timeout(runId: string, input: { seq: number }): Promise<AnswerResult> {
    return this.net(() => {
      const state = this.mustRun(runId);
      const { state: next, result } = applyTimeout(state, input, this.now(), this.skipsLeft(state.dayKey), lookup);
      this.commit(next);
      return result;
    });
  }

  async finish(runId: string, input: { reason: 'sunset' | 'quit'; clientMs?: number }): Promise<RunSummary> {
    return this.net(() => {
      const state = this.db.runs[runId];
      if (state) this.commit(finishRun(state, this.now(), input.reason, input.clientMs));
      const entry = Object.values(this.db.entries).find((e) => e.runId === runId);
      if (!entry?.summary) throw new GameError('not-found');
      return entry.summary;
    });
  }

  async getResult(competitionId: string): Promise<RunSummary | null> {
    return this.db.entries[competitionId]?.summary ?? null;
  }

  // -------------------------------------------------------- leaderboard --

  subscribeLeaderboard(
    competitionId: string,
    listener: (board: LeaderboardView) => void,
    options?: { limit?: number },
  ): Unsubscribe {
    const limit = options?.limit ?? 50;
    const emit = () => {
      const board = this.leaderboard(competitionId, limit);
      if (board) listener(board);
    };
    emit();
    const timer = setInterval(emit, 1000);
    const off = this.changes.on(emit);
    const offClock = this.clockChanges.on(emit);
    return () => {
      clearInterval(timer);
      off();
      offClock();
    };
  }

  subscribeWire(listener: (events: WireEvent[]) => void): Unsubscribe {
    const emit = () => listener(this.wire());
    emit();
    const timer = setInterval(emit, 4000);
    const offClock = this.clockChanges.on(emit);
    return () => {
      clearInterval(timer);
      offClock();
    };
  }

  async getChampions(days: number): Promise<ChampionRecord[]> {
    const now = this.now();
    const today = this.dayKeyAt(now);
    const out: ChampionRecord[] = [];
    for (let d = 0; d < days; d++) {
      const dayKey = addDays(today, -d);
      for (const kind of KINDS) {
        const c = buildCompetition(dayKey, kind, localZone);
        if (phaseOf(c, now) !== 'final') continue;
        const champ = this.championOf(c);
        if (champ) out.push(champ);
      }
    }
    return out.sort((a, b) => b.closesAt - a.closesAt);
  }

  async getStats(): Promise<PlayerStats> {
    const stats: PlayerStats = { runs: 0, correct: 0, wrong: 0, silent: 0, skips: 0, answerMs: 0, answered: 0, bestScore: null, crowns: 0 };
    for (const entry of Object.values(this.db.entries)) {
      if (entry.status !== 'done') continue;
      const t = entry.totals;
      stats.runs += 1;
      stats.correct += t.correct;
      stats.wrong += t.wrong;
      stats.silent += t.silent;
      stats.skips += t.skips;
      stats.answerMs += t.answerMs;
      stats.answered += t.answered;
      stats.bestScore = stats.bestScore === null ? t.score : Math.max(stats.bestScore, t.score);
    }
    const uid = this.db.profile?.uid;
    if (uid) stats.crowns = (await this.getChampions(30)).filter((c) => c.uid === uid).length;
    return stats;
  }

  // ----------------------------------------------------------- internals --

  private async net<T>(work: () => T): Promise<T> {
    await sleep(latency());
    const out = work();
    await sleep(latency());
    return out;
  }

  private setWarp(offset: number): void {
    this.db.warp = Math.round(offset);
    this.persist();
    this.clockChanges.emit();
    this.changes.emit();
  }

  private nextEvent(field: 'opensAt' | 'crownAt'): UpcomingEvent | null {
    const now = this.now();
    const today = this.dayKeyAt(now);
    const candidates = [...buildDay(today, localZone), ...buildDay(addDays(today, 1), localZone)]
      .map((c) => ({ competition: this.decorate(c, now), at: c[field] }))
      .filter((e) => e.at > now)
      .sort((a, b) => a.at - b.at);
    return candidates[0] ?? null;
  }

  private mustProfile(): Profile {
    if (!this.db.profile) throw new GameError('unauthenticated', 'Choose a name before you play.');
    return this.db.profile;
  }

  private mustCompetition(competitionId: string): Competition {
    const parsed = parseCompetitionId(competitionId);
    if (!parsed) throw new GameError('not-found');
    return buildCompetition(parsed.dayKey, parsed.kind, localZone);
  }

  private mustRun(runId: string): RunState {
    const state = this.db.runs[runId];
    if (!state) throw new GameError('run-over');
    return state;
  }

  private skipsLeft(dayKey: string): number {
    return Math.max(0, RULES.SKIPS_PER_DAY - (this.db.skipsUsed[dayKey] ?? 0));
  }

  private runStart(state: RunState, now: number, resumed: boolean, elapsedMs: number): RunStart {
    const question = currentQuestion(state, lookup);
    if (!question || !state.current) throw new GameError('run-over');
    return {
      runId: state.runId,
      competitionId: state.cid,
      question,
      questionElapsedMs: elapsedMs,
      graceMs: state.current.graceMs,
      totals: totalsOf(state),
      timeUsedMs: state.timeUsedMs,
      runMs: state.runMs,
      questionMs: state.questionMs,
      skipsLeft: this.skipsLeft(state.dayKey),
      resumed,
      serverNow: now,
    };
  }

  /** Store a run's new state; when it's over, keep its summary and drop the run. */
  private commit(state: RunState): void {
    const entry = this.db.entries[state.cid];
    if (entry) {
      entry.totals = totalsOf(state);
      if (state.status === 'done') {
        entry.status = 'done';
        entry.finishedAt = state.finishedAt;
        entry.summary = summarize(state, lookup);
      }
    }
    if (state.status === 'done') delete this.db.runs[state.runId];
    else this.db.runs[state.runId] = state;
    this.persist();
    this.changes.emit();
  }

  /** Finalise runs that were abandoned mid-way. The server clock never waits. */
  private sweep(now: number): void {
    for (const state of Object.values(this.db.runs)) {
      const parsed = parseCompetitionId(state.cid);
      if (!parsed) continue;
      const c = buildCompetition(parsed.dayKey, parsed.kind, localZone);
      const lastSeen = state.current?.sentAt ?? state.startedAt;
      if (now >= c.crownAt || now - lastSeen > STALE_RUN_MS) this.commit(finishRun(state, now, 'quit', 0));
    }
  }

  private myRow(competitionId: string): EntryRow | null {
    const entry = this.db.entries[competitionId];
    const profile = this.db.profile;
    if (!entry || !profile) return null;
    const t = entry.totals;
    const avgMs = t.answered > 0 ? t.answerMs / t.answered : 0;
    return {
      uid: profile.uid,
      handle: profile.handle,
      city: profile.city,
      avatarSeed: profile.avatarSeed,
      score: t.score,
      answered: t.answered,
      correct: t.correct,
      wrong: t.wrong,
      silent: t.silent,
      skips: t.skips,
      avgMs,
      status: entry.status,
      rankKey: rankKey({ score: t.score, answered: t.answered, avgMs }),
      startedAt: entry.startedAt,
      finishedAt: entry.finishedAt,
    };
  }

  private decorate(c: Competition, now: number): Competition {
    const field = fieldFor(c);
    const counts = countField(field, now);
    const mine = this.db.entries[c.id];
    const registered = this.db.registrations.includes(c.id) ? 1 : 0;
    return {
      ...c,
      registeredCount: counts.registered + registered,
      playersCount: counts.players + (mine ? 1 : 0),
      liveCount: counts.live + (mine?.status === 'live' ? 1 : 0),
      champion: phaseOf(c, now) === 'final' ? this.championOf(c) : null,
    };
  }

  private championOf(c: Competition): ChampionRecord | null {
    const field = fieldFor(c);
    const rival = bestRival(field);
    const me = this.myRow(c.id);
    const base = { competitionId: c.id, kind: c.kind, dayKey: c.dayKey, closesAt: c.closesAt, players: field.length + (me ? 1 : 0) };
    if (me && me.status === 'done' && (!rival || me.rankKey > rival.rankKey)) {
      return { ...base, uid: me.uid, handle: me.handle, city: me.city, avatarSeed: me.avatarSeed, score: me.score, answered: me.answered };
    }
    if (!rival) return null;
    return {
      ...base,
      uid: rival.uid,
      handle: rival.handle,
      city: rival.city,
      avatarSeed: rival.avatarSeed,
      score: rival.score,
      answered: rival.answered,
    };
  }

  private dayView(): DayView {
    const now = this.now();
    this.sweep(now);
    const dayKey = this.dayKeyAt(now);
    const competitions = buildDay(dayKey, localZone).map((c) => this.decorate(c, now));
    const tomorrow = buildDay(addDays(dayKey, 1), localZone)
      .filter((c) => c.kind !== 'daily')
      .map((c) => this.decorate(c, now));
    const ids = new Set([...competitions, ...tomorrow].map((c) => c.id));
    const played: Record<string, PlayedSummary> = {};
    for (const c of competitions) {
      const row = this.myRow(c.id);
      if (row) {
        played[c.id] = {
          competitionId: c.id,
          status: row.status,
          score: row.score,
          answered: row.answered,
          correct: row.correct,
          wrong: row.wrong,
          silent: row.silent,
          skips: row.skips,
          avgMs: row.avgMs,
          finishedAt: row.finishedAt,
        };
      }
    }
    const live = Object.values(this.db.runs).find((r) => r.status === 'live');
    const used = this.db.skipsUsed[dayKey] ?? 0;
    return {
      dayKey,
      competitions,
      tomorrow,
      skipsUsed: used,
      skipsLeft: Math.max(0, RULES.SKIPS_PER_DAY - used),
      registered: this.db.registrations.filter((id) => ids.has(id)),
      played,
      activeRun: live ? { runId: live.runId, competitionId: live.cid } : null,
      liveNow: competitions.filter((c) => phaseOf(c, now) === 'open').reduce((sum, c) => sum + c.liveCount, 0),
    };
  }

  private leaderboard(competitionId: string, limit: number): LeaderboardView | null {
    const parsed = parseCompetitionId(competitionId);
    if (!parsed) return null;
    const now = this.now();
    const c = buildCompetition(parsed.dayKey, parsed.kind, localZone);
    const rows: EntryRow[] = [];
    for (const r of fieldFor(c)) {
      const row = rivalRow(r, now);
      if (row) rows.push(row);
    }
    const me = this.myRow(competitionId);
    if (me) rows.push(me);
    rows.sort(compareEntries);
    const myIndex = me ? rows.findIndex((r) => r.uid === me.uid) : -1;
    return {
      competitionId,
      rows: rows.slice(0, limit),
      me: myIndex >= 0 ? rows[myIndex] : null,
      myRank: myIndex >= 0 ? myIndex + 1 : null,
      total: rows.length,
      live: rows.reduce((n, r) => n + (r.status === 'live' ? 1 : 0), 0),
      updatedAt: now,
    };
  }

  private wire(): WireEvent[] {
    const now = this.now();
    const events: WireEvent[] = [];
    for (const c of buildDay(this.dayKeyAt(now), localZone)) {
      const phase = phaseOf(c, now);
      if (phase === 'upcoming') continue;
      for (const r of fieldFor(c)) {
        if (r.endAt <= now && r.endAt > now - 20 * 60_000) {
          events.push({ id: `${c.id}:${r.uid}`, at: r.endAt, handle: r.handle, city: r.city, score: r.score, competitionId: c.id });
        }
      }
    }
    return events.sort((a, b) => b.at - a.at).slice(0, 12);
  }

  private prune(): void {
    const cutoff = addDays(this.dayKeyAt(this.now()), -30);
    for (const id of Object.keys(this.db.entries)) {
      const parsed = parseCompetitionId(id);
      if (!parsed || parsed.dayKey < cutoff) delete this.db.entries[id];
    }
    for (const key of Object.keys(this.db.skipsUsed)) if (key < cutoff) delete this.db.skipsUsed[key];
  }

  private persist(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.save(true);
    }, 120);
  }

  private async save(immediate = false): Promise<void> {
    if (!immediate) return this.persist();
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      // Storage can be unavailable (private browsing). The game still works for this session.
    }
  }
}
