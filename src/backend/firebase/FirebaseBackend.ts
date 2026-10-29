import { onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
} from 'firebase/firestore';
import { httpsCallable, type HttpsCallable } from 'firebase/functions';
import { ERROR_COPY, GameError, type GameErrorCode } from '@shared/errors';
import { compareEntries } from '@shared/ranking';
import { RULES } from '@shared/rules';
import { KINDS, addDays, buildCompetition, ianaZone, parseCompetitionId, phaseOf, type ZoneResolver } from '@shared/schedule';
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
import { Emitter } from '@/lib/emitter';
import type { DayView, GameBackend, LeaderboardView, PlayedSummary, Unsubscribe, WireEvent } from '../types';
import { FUNCTIONS_REGION, firebase, type FirebaseClients } from './client';

interface DayDoc {
  skipsUsed?: number;
  registered?: string[];
  played?: Record<string, PlayedSummary>;
  activeRun?: { runId: string; competitionId: string } | null;
}

type Payload = Record<string, unknown> & { op: string };

/**
 * The real server. Reads stream straight from Firestore (security rules make
 * them read-only); every write is a call to the `api` Cloud Function.
 */
export class FirebaseBackend implements GameBackend {
  readonly kind = 'firebase' as const;
  readonly label = `Firebase · ${FUNCTIONS_REGION}`;

  private fb!: FirebaseClients;
  private api!: HttpsCallable<Payload, unknown>;
  private uid = '';
  private offset = 0;
  private zone: ZoneResolver = ianaZone('UTC');
  private clock = new Emitter();

  async init(): Promise<void> {
    this.fb = firebase();
    this.api = httpsCallable<Payload, unknown>(this.fb.functions, 'api', { timeout: 15_000 });
    const restored = await new Promise<User | null>((resolve) => {
      const off = onAuthStateChanged(this.fb.auth, (user) => {
        off();
        resolve(user);
      });
    });
    const user = restored ?? (await signInAnonymously(this.fb.auth)).user;
    this.uid = user.uid;
    await this.syncClock();
    setInterval(() => void this.syncClock().catch(() => {}), 5 * 60_000);
  }

  /** Server time with the round trip split down the middle. */
  private async syncClock(): Promise<void> {
    const t0 = Date.now();
    const res = await this.call<{ now: number; tz: string }>({ op: 'clock' });
    const t1 = Date.now();
    const offset = res.now - (t0 + t1) / 2;
    const jumped = Math.abs(offset - this.offset) > 2000;
    this.offset = offset;
    if (res.tz !== this.zone.id) this.zone = ianaZone(res.tz);
    if (jumped) this.clock.emit();
  }

  private async call<T>(payload: Payload): Promise<T> {
    try {
      return (await this.api(payload)).data as T;
    } catch (error) {
      const e = error as { code?: string; message?: string; details?: { code?: string } };
      const code = e.details?.code;
      // The game's own words, not the transport's (which can carry status codes).
      if (code && code in ERROR_COPY) throw new GameError(code as GameErrorCode);
      // Network trouble: let the caller retry quietly.
      if (e.code === 'functions/unavailable' || e.code === 'functions/deadline-exceeded' || (e.code === 'functions/internal' && e.message === 'internal')) {
        throw new Error(e.message ?? 'network');
      }
      if (e.code === 'functions/unauthenticated') throw new GameError('unauthenticated');
      throw new GameError('unavailable');
    }
  }

  now(): number {
    return Date.now() + this.offset;
  }

  dayKeyAt(epoch: number): string {
    return this.zone.dayKeyOf(epoch);
  }

  onClockChange(listener: () => void): Unsubscribe {
    return this.clock.on(listener);
  }

  // ------------------------------------------------------------ profile --

  async getProfile(): Promise<Profile | null> {
    const snap = await getDoc(doc(this.fb.db, 'users', this.uid));
    const data = snap.data() as Profile | undefined;
    return data?.handle ? { uid: this.uid, handle: data.handle, city: data.city ?? '', avatarSeed: data.avatarSeed ?? 0, createdAt: data.createdAt ?? 0 } : null;
  }

  async saveProfile(input: { handle: string; city: string }): Promise<Profile> {
    return this.call<Profile>({ op: 'profile.upsert', handle: input.handle, city: input.city });
  }

  // ---------------------------------------------------------------- day --

  private normalize(data: DocumentData): Competition {
    return {
      ...(data as Competition),
      registeredCount: data.registeredCount ?? 0,
      playersCount: data.playersCount ?? 0,
      liveCount: data.liveCount ?? 0,
      champion: data.champion ?? null,
    };
  }

  subscribeDay(listener: (day: DayView) => void): Unsubscribe {
    let today = this.dayKeyAt(this.now());
    let comps = new Map<string, Competition>();
    let days: Record<string, DayDoc> = {};
    let unsubs: Unsubscribe[] = [];
    let ensured = false;

    const compose = (): DayView => {
      const now = this.now();
      const tomorrowKey = addDays(today, 1);
      const pick = (dayKey: string) =>
        KINDS.map((k) => comps.get(`${dayKey}_${k}`) ?? buildCompetition(dayKey, k, this.zone));
      const competitions = pick(today);
      const tomorrow = pick(tomorrowKey).filter((c) => c.kind !== 'daily');
      const used = days[today]?.skipsUsed ?? 0;
      return {
        dayKey: today,
        competitions,
        tomorrow,
        skipsUsed: used,
        skipsLeft: Math.max(0, RULES.SKIPS_PER_DAY - used),
        registered: [...(days[today]?.registered ?? []), ...(days[tomorrowKey]?.registered ?? [])],
        played: days[today]?.played ?? {},
        activeRun: days[today]?.activeRun ?? null,
        liveNow: competitions.filter((c) => phaseOf(c, now) === 'open').reduce((n, c) => n + c.liveCount, 0),
      };
    };
    const emit = () => listener(compose());
    const wire = () => {
      unsubs.forEach((u) => u());
      unsubs = [];
      const tomorrowKey = addDays(today, 1);
      unsubs.push(
        onSnapshot(query(collection(this.fb.db, 'competitions'), where('dayKey', 'in', [today, tomorrowKey])), (snap) => {
          comps = new Map(snap.docs.map((d) => [d.id, this.normalize(d.data())]));
          if (!ensured && !snap.docs.some((d) => d.get('dayKey') === today)) {
            ensured = true;
            void this.call({ op: 'day.ensure' }).catch(() => {});
          }
          emit();
        }),
      );
      for (const key of [today, tomorrowKey]) {
        unsubs.push(
          onSnapshot(doc(this.fb.db, 'users', this.uid, 'days', key), (snap) => {
            days = { ...days, [key]: (snap.data() as DayDoc | undefined) ?? {} };
            emit();
          }),
        );
      }
    };
    wire();
    emit();
    const timer = setInterval(() => {
      const key = this.dayKeyAt(this.now());
      if (key !== today) {
        today = key;
        days = {};
        ensured = false;
        wire();
      }
      emit();
    }, 1000);
    return () => {
      clearInterval(timer);
      unsubs.forEach((u) => u());
    };
  }

  async getCompetition(competitionId: string): Promise<Competition | null> {
    const parsed = parseCompetitionId(competitionId);
    if (!parsed) return null;
    const snap = await getDoc(doc(this.fb.db, 'competitions', competitionId));
    return snap.exists() ? this.normalize(snap.data()) : buildCompetition(parsed.dayKey, parsed.kind, this.zone);
  }

  async register(competitionId: string): Promise<void> {
    await this.call({ op: 'register', cid: competitionId });
  }

  async unregister(competitionId: string): Promise<void> {
    await this.call({ op: 'unregister', cid: competitionId });
  }

  // ---------------------------------------------------------------- run --

  startRun(competitionId: string): Promise<RunStart> {
    return this.call<RunStart>({ op: 'run.start', cid: competitionId });
  }

  resumeRun(competitionId: string): Promise<RunStart | null> {
    return this.call<RunStart | null>({ op: 'run.resume', cid: competitionId });
  }

  answer(runId: string, input: { seq: number; choice: number; clientMs: number }): Promise<AnswerResult> {
    return this.call<AnswerResult>({ op: 'run.answer', runId, ...input });
  }

  skip(runId: string, input: { seq: number; clientMs: number }): Promise<AnswerResult> {
    return this.call<AnswerResult>({ op: 'run.skip', runId, ...input });
  }

  timeout(runId: string, input: { seq: number }): Promise<AnswerResult> {
    return this.call<AnswerResult>({ op: 'run.timeout', runId, ...input });
  }

  finish(runId: string, input: { reason: 'sunset' | 'quit'; clientMs?: number }): Promise<RunSummary> {
    return this.call<RunSummary>({ op: 'run.finish', runId, ...input });
  }

  async getResult(competitionId: string): Promise<RunSummary | null> {
    const snap = await getDoc(doc(this.fb.db, 'users', this.uid, 'history', competitionId));
    return snap.exists() ? (snap.data() as RunSummary) : null;
  }

  // -------------------------------------------------------- leaderboard --

  subscribeLeaderboard(competitionId: string, listener: (board: LeaderboardView) => void, options?: { limit?: number }): Unsubscribe {
    const entries = collection(this.fb.db, 'competitions', competitionId, 'entries');
    let rows: EntryRow[] = [];
    let me: EntryRow | null = null;
    let myRank: number | null = null;
    let total = 0;
    let live = 0;
    let lastCount = 0;
    let alive = true;
    const emit = () =>
      alive && listener({ competitionId, rows, me, myRank, total, live, updatedAt: this.now() });
    // Counting is cheap but not free: at most every ten seconds.
    const count = async (force = false) => {
      if (!force && Date.now() - lastCount < 10_000) return;
      lastCount = Date.now();
      try {
        const [t, l, ahead] = await Promise.all([
          getCountFromServer(entries),
          getCountFromServer(query(entries, where('status', '==', 'live'))),
          me ? getCountFromServer(query(entries, where('rankKey', '>', me.rankKey))) : Promise.resolve(null),
        ]);
        total = t.data().count;
        live = l.data().count;
        myRank = ahead ? ahead.data().count + 1 : null;
        emit();
      } catch {
        // Counts are decoration; the board still renders.
      }
    };
    const unsubTop = onSnapshot(query(entries, orderBy('rankKey', 'desc'), limit(options?.limit ?? 50)), (snap) => {
      rows = snap.docs.map((d) => d.data() as EntryRow).sort(compareEntries);
      emit();
      void count();
    });
    const unsubMe = onSnapshot(doc(entries, this.uid), (snap) => {
      me = snap.exists() ? (snap.data() as EntryRow) : null;
      emit();
      void count(true);
    });
    const timer = setInterval(() => void count(), 10_000);
    return () => {
      alive = false;
      clearInterval(timer);
      unsubTop();
      unsubMe();
    };
  }

  subscribeWire(listener: (events: WireEvent[]) => void): Unsubscribe {
    let alive = true;
    const load = async () => {
      const cid = `${this.dayKeyAt(this.now())}_daily`;
      try {
        const snap = await getDocs(
          query(collection(this.fb.db, 'competitions', cid, 'entries'), where('status', '==', 'done'), orderBy('finishedAt', 'desc'), limit(12)),
        );
        if (!alive) return;
        listener(
          snap.docs.map((d) => {
            const e = d.data() as EntryRow;
            return { id: `${cid}:${e.uid}`, at: e.finishedAt ?? 0, handle: e.handle, city: e.city, score: e.score, competitionId: cid };
          }),
        );
      } catch {
        if (alive) listener([]);
      }
    };
    void load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }

  async getChampions(days: number): Promise<ChampionRecord[]> {
    const snap = await getDocs(query(collection(this.fb.db, 'champions'), orderBy('closesAt', 'desc'), limit(days * 4)));
    const cutoff = this.now() - days * 24 * 3600_000;
    return snap.docs.map((d) => d.data() as ChampionRecord).filter((c) => c.closesAt >= cutoff);
  }

  async getStats(): Promise<PlayerStats> {
    const snap = await getDoc(doc(this.fb.db, 'users', this.uid));
    const data = snap.data() ?? {};
    const s = (data.stats ?? {}) as Partial<PlayerStats>;
    return {
      runs: s.runs ?? 0,
      correct: s.correct ?? 0,
      wrong: s.wrong ?? 0,
      silent: s.silent ?? 0,
      skips: s.skips ?? 0,
      answerMs: s.answerMs ?? 0,
      answered: s.answered ?? 0,
      bestScore: s.bestScore ?? null,
      crowns: (data.crowns as number | undefined) ?? 0,
    };
  }
}
