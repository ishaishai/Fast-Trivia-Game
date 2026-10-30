# Glint! — quick trivia for everyone

A bright, bouncy trivia game that kids and adults can pick up in seconds. There's a new game every day: sixty seconds of play, five seconds per question, and one crown for the top score. Sunny, the game's sun, crosses the sky while you play, and a moon slides over Sunny's face to show each question's five seconds.

Every screen has one obvious thing to do. **Play** has today's game and one card per session, **Ranks** has a podium and the winners, and **Me** has your stats and settings. The sky follows your time of day: morning, daytime, evening or night.

Built with Expo SDK 58 / React Native 0.88 / Expo Router. One codebase for web, iOS and Android, with two servers:

- **Offline mock** (default): runs entirely on the device. A field of simulated rivals plays alongside you, and a preview clock lets you jump to any time.
- **Firebase**: Auth (anonymous), Firestore, Cloud Functions v2 and Hosting.

## Run it

```bash
npm install
npm run web          # http://localhost:8091 — offline mock, nothing to configure
npm run ios          # or: npm run android
```

To see sessions open and crowns awarded at any hour, click **Preview** in the top bar (on phones: Me › Time machine).

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

## App stores

Under the icon the app is called **Glint!** (`expo.name` in `app.json`). In the App Store and on Google Play it's listed as **Glint!: Daily Trivia**, which you set as the app name in App Store Connect and the Play Console. The iOS bundle id and the Android package are both `com.ishaishai.glint`. EAS builds and submits it (`eas.json`): `eas build --profile production`, then `eas submit`.

## Architecture

- **`shared/`**: the rules engine (scoring, server-authoritative timing, decks, ranking, schedule) plus 324 original questions. The mock and the Cloud Functions both use this exact code.
- **Timing:** each answer's thinking time is the client's own measurement, clamped by the server's clock. A client that under-reports its time gains at most 0.9 s per question. Replayed or out-of-order answers are rejected.
- **Answer security:** the answer bank never reaches production clients. `metro.config.js` swaps in a stub for Firebase builds. Firestore rules make every collection read-only for clients, and `runs`, which hold the answers, are unreadable.
- **`functions/`**: `api` is one callable for every operation; `tick` creates each day and crowns champions.
- **`src/`**: Expo Router screens, the design system (four sky worlds that follow the time of day, white cards, chunky lip buttons, Fredoka type, a spring-based motion kit), the run controller, and the mock backend.

## Checks

```bash
npm test             # 56 unit tests: engine, timing, bank, colour contrast, card status, run windows
npm run typecheck && npx eslint .
npm --prefix functions run typecheck
```
