# Glint! — notes for working on this repo

Daily trivia game for kids and adults: bright, chunky and animated, one obvious thing to do per screen. Expo SDK 58 / RN 0.88 / Expo Router (routes in `src/app`), Reanimated 4, Zustand. One codebase for web + iOS + Android. See README.md for rules, run and deploy steps.

The name is **Glint!**, and the “!” is part of it. The store listing is “Glint!: Daily Trivia”. In copy, let the name end a sentence (“Welcome to Glint!”) rather than putting more punctuation after it.

## Commands

```bash
npm run web            # dev server on :8091 (offline mock backend)
npm test               # vitest: shared engine, question bank, colour contrast, card status, run windows
npm run typecheck      # app; functions: npm --prefix functions run typecheck
npx eslint .
npm run smoke:firebase # end-to-end against Firebase emulators (needs Java)
```

## Architecture

- `shared/` is pure TypeScript, used verbatim by the app's mock backend and by `functions/` (esbuild bundles it). The rules, timing/anti-cheat, decks, ranking, schedule and question bank live here, and **only** here. Change them once.
- `src/backend/` defines the `GameBackend` interface with two implementations: `mock/` (offline, simulated rivals, preview clock) and `firebase/`. `EXPO_PUBLIC_BACKEND` picks one at build time. `metro.config.js` stubs the other, so firebase builds never contain the answer bank.
- `src/run/useRunController.ts` is the run state machine. Its transitions must last exactly `RULES.INTRO_MS`, `FEEDBACK_MS` and `SKIP_FEEDBACK_MS`, because the server's timing allowance assumes them. Every animation on the run screen takes its duration from `src/run/windows.ts`; `windows.test.ts` checks they fit. Celebrations longer than a window belong in the HUD (which may overlap transitions) or on the results screen.
- Worlds (`src/theme/palette.ts`): every screen is painted in one of four lights (Morning, Daytime, Evening, Night), each a sky gradient (`light.sky`) drawn by `WorldBackdrop`. The ambient light follows local time; `LightScope` overrides it. Content sits on white cards: anything inside `Card` (or `CardScope`) reads the card's colours from `useLight()`, so put `LightScope` outside and `CardScope` inside. Use `light.sunText` (not `light.sun`) for accent text. Colours live only in `palette.ts` as named tokens; `src/theme/contrast.test.ts` enforces WCAG AA, sampling each gradient.
- Motion primitives are in `src/components/motion/Playful.tsx` (`PopIn`, `Float`, `Pulse`, `Wiggle`, `useSquish`, `useAmbientClock`) and `src/components/fx/` (`BurstHost`, `Confetti`). Springs are physical (`springs` in `motion.ts`). Everything checks `useMotionOK()`; under reduced motion the timer and 3·2·1 still move, decoration doesn't.
- Card state comes from pure helpers in `src/lib/status.ts` (`actionOf`, `primaryCompetition`, `sessionSlots`, `countdownTarget`, tested in `status.test.ts`), turned into one sentence by `src/lib/statusLine.ts`.

## Gotchas (learned the hard way)

- **Don't use `<Link asChild>` around `Tap`/`Pressable`.** Expo Router's Slot flattens styles and drops function styles. Pass `href` to `Tap` or `Button` instead; on web they render a real `<a>` and route client-side.
- **Hidden tab routes (`href: null`) aren't navigable in SDK 58.** Screens that aren't tabs (`competition/[id]`, `results/[id]`, `rules`) live in the root Stack and use `<Page nav>` for their own chrome. The tabs are Play / Ranks / Me; `/champions` is a root redirect to `/standings?view=winners`.
- **Native views don't get touches outside their parent's bounds.** The floating tab bar is drawn over the whole tab layout (`(tabs)/_layout.tsx`), not in the navigator's `tabBar` slot, which has no height once the bar floats. Pages pad for it through `useTabBarSpace()`.
- **The run is a native `fullScreenModal`,** so anything drawn in the root layout sits underneath it. Pixel bursts on the run use the screen's own `BurstHost`.
- `presentation: 'fullScreenModal'` renders as a small card on web; the run screen uses `card` on web.
- **Tight display leading clips glyphs on native.** Fredoka's natural line is 1.21 em (hhea 0.974 + 0.236); the type scale sets 1.04–1.2 for headings. The web centres the glyphs and lets them spill, but iOS sits the line on its descent and cuts the tops off (Android clips too). `T`, `WordsReveal` and `Odometer` add `glyphRoom()` padding with matching negative margins. Any raw `<Text>` with `lineHeight < 1.21 × fontSize` needs it as well.
- **Numbers and names must never be cut short.** Use `T fit={min}` for one-line names and stats; it relies on `adjustsFontSizeToFit` natively and on measuring the DOM on the web. Size numeric columns with `numeralWidth()`: Fredoka's figures are proportional (0.38–0.59 em). `WordsReveal` scales the whole heading so its longest word fits the line.
- An absolutely positioned child without a width is squeezed to its parent's width by Yoga, though the web lets it grow. Give labels that hang off a narrow parent an explicit width.
- `backgroundImage` (linear-gradient strings) and `boxShadow` are native style props in RN 0.88 and pass through to CSS on the web; `Gradient` and `Card` wrap them. Put a shadow on a view without `overflow: 'hidden'`. Android draws outer shadows from API 28 up. Use soft shadows only on a few big cards; long lists get `flatShadow`.
- Never read `sharedValue.value` during render. Use `.set()` in handlers so the React Compiler lint rules pass.
- npm's global cache (`~/.npm`) isn't writable in this sandbox. Use `npm_config_cache=<scratchpad>/npm-cache npm install`.
- **Firebase Hosting must upload `dist/assets/node_modules/`.** Expo exports package assets there, fonts included, so `firebase.json` leaves `**/node_modules/**` out of `ignore` (Firebase's default list has it). The SPA rewrite skips `/assets` and `/_expo`, so a missing asset gets a 404 rather than `index.html` served with the year-long immutable cache header.
- `functions/.env` holds parameter defaults (`SCHEDULE_TZ`, `API_MIN_INSTANCES`). Without it, the emulator stops to prompt for them.
- Emulators run on the `demo-glint` project id, so no real Firebase project is needed.
