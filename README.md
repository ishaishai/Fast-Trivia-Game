# Meridian — the daily trivia championship

**Win the day.** A trivia competition that resets every midnight. Each run is sixty seconds, sunrise to sunset, and you get three seconds per question. The timer is drawn as a moon eclipsing the sun.

Built with Expo SDK 58 / React Native 0.88 / Expo Router. One codebase for web, iOS and Android, with two servers:

- **Offline mock** (default): runs entirely on the device. A field of simulated rivals plays alongside you, and a preview clock lets you jump to any time.
- **Firebase**: Auth (anonymous), Firestore, Cloud Functions v2 and Hosting.

## Run it

```bash
npm install
npm run web          # http://localhost:8091 — offline mock, nothing to configure
npm run ios          # or: npm run android
```

To see sessions open and crowns awarded at any hour, click **Preview** in the top bar (on phones: You › Preview controls).

## The rules (as built)

| | |
|---|---|
| Run | 60 s of answering. The clock only runs while a question is on screen. |
| Question | 2–4 choices, 3 s. Right **+3**, wrong **−1**, silence (eclipse) **−1** |
| Skips | 24 a day, shared by every competition, refilled at midnight |
| Entry | One run per competition. Everyone gets the same 80-question deck in the same order. |
| Winner | Most points. Ties go to more answered, then faster average, then whoever finished first. |
| Competitions | **The Daily** 00:00–24:00, open to everyone. **First Light** 08:00, **Zenith** 13:00 and **Blue Hour** 20:00 each run one hour and need registration, which opens 24 h before. |

## Firebase

```bash
npm run smoke:firebase   # full end-to-end test on local emulators (25 checks)
npm run web:emulators    # play the app against the emulators (run `npm run emulators` first)
```

To deploy:

1. Copy `.firebaserc.example` to `.firebaserc` and fill in your project id. The project needs the Blaze plan.
2. Copy `.env.example` to `.env`, set `EXPO_PUBLIC_BACKEND=firebase` and add your web app keys.
3. Optional: set `SCHEDULE_TZ` in `functions/.env` (default `UTC`), and set `API_MIN_INSTANCES=1` during live events.
4. Run `npm run deploy`. This builds the web app with Firebase and deploys hosting, rules, indexes and functions.

## Architecture

- **`shared/`**: the rules engine (scoring, server-authoritative timing, decks, ranking, schedule) plus 324 original questions. The mock and the Cloud Functions both use this exact code.
- **Timing:** each answer's thinking time is the client's own measurement, clamped by the server's clock. A client that under-reports its time gains at most 0.9 s per question. Replayed or out-of-order answers are rejected.
- **Answer security:** the answer bank never reaches production clients. `metro.config.js` swaps in a stub for Firebase builds. Firestore rules make every collection read-only for clients, and `runs`, which hold the answers, are unreadable.
- **`functions/`**: `api` is one callable for every operation; `tick` creates each day and crowns champions.
- **`src/`**: Expo Router screens, the design system (four light states that follow real time of day), the run controller, and the mock backend.

## Checks

```bash
npm test             # 37 unit tests: engine, timing, bank, colour contrast
npm run typecheck && npx eslint .
npm --prefix functions run typecheck
```
