import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/https';
import { defineInt, defineString } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/scheduler';
import { GameError, isGameError } from '../../shared/errors';
import { addDays, ianaZone } from '../../shared/schedule';
import { ensureDay, finish, register, resume, runAction, startRun, tick as runTick, upsertProfile } from './game';

initializeApp();

/** The time zone the competition schedule runs in (First Light at 08:00 *here*). */
const SCHEDULE_TZ = defineString('SCHEDULE_TZ', { default: 'UTC', description: 'IANA time zone for the competition schedule' });
/** Keep one instance warm during live sessions so answers never wait on a cold start. */
const API_MIN_INSTANCES = defineInt('API_MIN_INSTANCES', { default: 0 });
const REGION = 'europe-west1';

setGlobalOptions({ region: REGION, maxInstances: 20 });

type Payload = Record<string, unknown>;

const str = (v: unknown): string => {
  if (typeof v !== 'string' || v.length > 120) throw new GameError('invalid');
  return v;
};
const int = (v: unknown, min = 0, max = 1_000_000): number => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new GameError('invalid');
  return Math.round(v);
};

/**
 * One callable for every game operation, so a single warm instance serves a
 * whole run. Rule errors travel as `failed-precondition` with the game's own
 * code in `details`, which the client turns back into a GameError.
 */
export const api = onCall<Payload>(
  { cors: true, minInstances: API_MIN_INSTANCES, enforceAppCheck: false, concurrency: 80, timeoutSeconds: 20 },
  async (request) => {
    const uid = request.auth?.uid;
    const data = request.data ?? {};
    const op = data.op;
    const now = Date.now();
    const zone = ianaZone(SCHEDULE_TZ.value());
    try {
      if (op === 'clock') {
        return { now, dayKey: zone.dayKeyOf(now), tz: zone.id };
      }
      if (!uid) throw new GameError('unauthenticated');
      switch (op) {
        case 'profile.upsert':
          return await upsertProfile(uid, { handle: data.handle, city: data.city }, now);
        case 'day.ensure': {
          const today = zone.dayKeyOf(now);
          await ensureDay(today, zone);
          await ensureDay(addDays(today, 1), zone);
          return { ok: true };
        }
        case 'register':
          await register(uid, str(data.cid), now, zone);
          return { ok: true };
        case 'unregister':
          await register(uid, str(data.cid), now, zone, true);
          return { ok: true };
        case 'run.start':
          return await startRun(uid, str(data.cid), now, zone);
        case 'run.resume':
          return await resume(uid, str(data.cid), now);
        case 'run.answer':
          return await runAction(uid, str(data.runId), { kind: 'answer', seq: int(data.seq, 0, 500), choice: int(data.choice, 0, 3), clientMs: int(data.clientMs, 0, 600_000) }, now);
        case 'run.skip':
          return await runAction(uid, str(data.runId), { kind: 'skip', seq: int(data.seq, 0, 500), clientMs: int(data.clientMs, 0, 600_000) }, now);
        case 'run.timeout':
          return await runAction(uid, str(data.runId), { kind: 'timeout', seq: int(data.seq, 0, 500) }, now);
        case 'run.finish': {
          const reason = data.reason === 'quit' ? 'quit' : 'sunset';
          const clientMs = data.clientMs === undefined ? undefined : int(data.clientMs, 0, 600_000);
          return await finish(uid, str(data.runId), reason, clientMs, now);
        }
        default:
          throw new GameError('invalid', 'Unknown operation.');
      }
    } catch (error) {
      if (isGameError(error)) throw new HttpsError('failed-precondition', error.message, { code: error.code });
      console.error('api', op, error);
      throw new HttpsError('internal', 'Something went wrong on the server.');
    }
  },
);

/** Creates tomorrow, crowns what has closed, tidies abandoned runs. */
export const tick = onSchedule({ schedule: 'every 5 minutes', timeoutSeconds: 300 }, async () => {
  await runTick(Date.now(), ianaZone(SCHEDULE_TZ.value()));
});
