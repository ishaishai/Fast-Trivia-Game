#!/usr/bin/env node
/**
 * End-to-end check of the real server against the local emulators.
 *   npm run smoke:firebase
 * (runs: firebase emulators:exec --project demo-meridian --only auth,firestore,functions "node scripts/smoke-firebase.mjs")
 */
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-meridian', appId: 'demo-app' });
const auth = getAuth(app);
const db = getFirestore(app);
const fns = getFunctions(app, 'europe-west1');
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectFunctionsEmulator(fns, '127.0.0.1', 5001);
const api = httpsCallable(fns, 'api');
const call = async (payload) => (await api(payload)).data;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures += 1;
};
const expectError = async (fn, code, label) => {
  try {
    await fn();
    check(false, label, 'no error');
  } catch (e) {
    check(e?.details?.code === code || e?.code === code, label, e?.details?.code ?? e?.code);
  }
};

console.log('Meridian server smoke test');
const { user } = await signInAnonymously(auth);
check(Boolean(user.uid), 'anonymous sign-in');

const clock = await call({ op: 'clock' });
check(Math.abs(clock.now - Date.now()) < 5000, 'server clock', `${clock.dayKey} ${clock.tz}`);

const profile = await call({ op: 'profile.upsert', handle: 'smoke.test', city: 'Testville' });
check(profile.handle === 'smoke.test', 'profile saved', profile.handle);
await expectError(() => call({ op: 'profile.upsert', handle: 'x' }), 'invalid', 'bad handle rejected');

await call({ op: 'day.ensure' });
const daily = `${clock.dayKey}_daily`;
const comp = await getDoc(doc(db, 'competitions', daily));
check(comp.exists(), 'today’s competitions exist', daily);

const start = await call({ op: 'run.start', cid: daily });
check(Boolean(start.runId && start.question?.text), 'run started', start.question.text);
check(start.question.options.length >= 2 && !('correct' in start.question), 'question carries no answer');

// Play like a person: wait out the intro, think, answer; the transition between questions is the server's allowance.
let seq = start.question.seq;
await sleep(2400 + 120);
let result;
for (let i = 0; i < 4; i++) {
  const think = 500 + Math.round(Math.random() * 400);
  await sleep(think);
  result = await call({ op: 'run.answer', runId: start.runId, seq, choice: 0, clientMs: think });
  check(['correct', 'wrong'].includes(result.outcome), `answer ${i + 1}`, `${result.outcome}, ${result.thinkMs} ms`);
  seq = result.next.seq;
  await sleep(600);
}
await sleep(300);
result = await call({ op: 'run.skip', runId: start.runId, seq, clientMs: 300 });
check(result.outcome === 'skipped' && result.skipsLeft === 23, 'skip spends one of 24', `left ${result.skipsLeft}`);
seq = result.next.seq;
await sleep(300 + 3100);
result = await call({ op: 'run.timeout', runId: start.runId, seq });
check(result.outcome === 'silent' && result.delta === -1, 'eclipse costs one point');
await expectError(() => call({ op: 'run.answer', runId: start.runId, seq, choice: 0, clientMs: 500 }), 'bad-seq', 'replayed answer rejected');

const summary = await call({ op: 'run.finish', runId: start.runId, reason: 'quit', clientMs: 200 });
check(summary.totals.answered === 4 && summary.totals.skips === 1 && summary.totals.silent === 1, 'run finished', `score ${summary.totals.score}`);
check(summary.review.length >= 6, 'review returned', `${summary.review.length} questions`);

const top = await getDocs(query(collection(db, 'competitions', daily, 'entries'), orderBy('rankKey', 'desc'), limit(5)));
const mine = top.docs.map((d) => d.data()).find((e) => e.uid === user.uid);
check(mine?.status === 'done' && mine.score === summary.totals.score, 'leaderboard entry published', `rankKey ${mine?.rankKey}`);
const history = await getDoc(doc(db, 'users', user.uid, 'history', daily));
check(history.exists(), 'run history readable by its owner');
await expectError(() => call({ op: 'run.start', cid: daily }), 'already-played', 'one run per competition');

// Register for whichever session currently takes registrations (opens 24 h before its doors).
const tomorrow = new Date(`${clock.dayKey}T12:00:00Z`);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
const days = [clock.dayKey, tomorrow.toISOString().slice(0, 10)];
const sessions = [];
for (const day of days) {
  for (const kind of ['firstlight', 'zenith', 'bluehour']) {
    const snap = await getDoc(doc(db, 'competitions', `${day}_${kind}`));
    if (snap.exists()) sessions.push(snap.data());
  }
}
const now = Date.now();
const open = sessions.find((c) => c.regOpensAt <= now && now < c.regClosesAt);
if (open) {
  await call({ op: 'register', cid: open.id });
  const dayDoc = await getDoc(doc(db, 'users', user.uid, 'days', open.dayKey));
  check((dayDoc.data()?.registered ?? []).includes(open.id), 'registered for a session', open.id);
  await expectError(() => call({ op: 'run.start', cid: open.id }), 'not-open', 'doors not open yet');
}
const notYet = sessions.find((c) => now < c.regOpensAt);
if (notYet) await expectError(() => call({ op: 'register', cid: notYet.id }), 'registration-not-open', 'registration not open yet', );

// Security rules: clients read, the server writes.
await expectError(() => getDocs(collection(db, 'runs')), 'permission-denied', 'runs (with answers) unreadable');
await expectError(() => setDoc(doc(db, 'competitions', daily, 'entries', user.uid), { score: 999 }), 'permission-denied', 'entries not writable');
await expectError(() => setDoc(doc(db, 'users', user.uid), { crowns: 99 }), 'permission-denied', 'profile not writable directly');

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
