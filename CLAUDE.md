# Meridian — notes for working on this repo

Daily trivia championship. Expo SDK 58 / RN 0.88 / Expo Router (routes in `src/app`), Reanimated 4, Zustand. One codebase for web + iOS + Android. See README.md for rules, run and deploy steps.

## Commands

```bash
npm run web            # dev server on :8091 (offline mock backend)
npm test               # vitest: shared engine, question bank, colour contrast
npm run typecheck      # app; functions: npm --prefix functions run typecheck
npx eslint .
npm run smoke:firebase # end-to-end against Firebase emulators (needs Java)
```

## Architecture

- `shared/` is pure TypeScript, used verbatim by the app's mock backend and by `functions/` (esbuild bundles it). The rules, timing/anti-cheat, decks, ranking, schedule and question bank live here, and **only** here. Change them once.
- `src/backend/` defines the `GameBackend` interface with two implementations: `mock/` (offline, simulated rivals, preview clock) and `firebase/`. `EXPO_PUBLIC_BACKEND` picks one at build time. `metro.config.js` stubs the other, so firebase builds never contain the answer bank.
- `src/run/useRunController.ts` is the run state machine. Its transitions must last exactly `RULES.INTRO_MS`, `FEEDBACK_MS` and `SKIP_FEEDBACK_MS`, because the server's timing allowance assumes them.
- Light states (`src/theme/palette.ts`): every screen is painted in one of four lights. The ambient light follows local time; `LightScope` overrides it. Use `light.sunText` (not `light.sun`) for sun-coloured text. `src/theme/contrast.test.ts` enforces WCAG AA.

## Gotchas (learned the hard way)

- **Don't use `<Link asChild>` around `Tap`/`Pressable`.** Expo Router's Slot flattens styles and drops function styles. Pass `href` to `Tap` or `Button` instead; on web they render a real `<a>` and route client-side.
- **Hidden tab routes (`href: null`) aren't navigable in SDK 58.** Screens that aren't tabs (`competition/[id]`, `results/[id]`, `rules`) live in the root Stack and use `<Page nav>` for their own chrome.
- `presentation: 'fullScreenModal'` renders as a small card on web; the run screen uses `card` on web.
- **Tight display leading clips glyphs on native.** Big Shoulders' natural line is 1.2 em; the type scale sets 0.86–1.0. The web centres the glyphs and lets them spill, but iOS sits the line on its descent and cuts the tops off (Android clips too). `T`, `WordsReveal` and `Odometer` add `glyphRoom()` padding with matching negative margins. Any raw `<Text>` with `lineHeight < 1.2 × fontSize` needs it as well.
- **Numbers and names must never be cut short.** Use `T fit={min}` for one-line names and stats; it relies on `adjustsFontSizeToFit` natively and on measuring the DOM on the web. Size numeric columns with `numeralWidth()`: Big Shoulders has no tabular figures. `WordsReveal` scales the whole heading so its longest word fits the line.
- An absolutely positioned child without a width is squeezed to its parent's width by Yoga, though the web lets it grow. Give labels that hang off a narrow parent an explicit width (see `DayRuler`).
- Never read `sharedValue.value` during render. Use `.set()` in handlers so the React Compiler lint rules pass.
- npm's global cache (`~/.npm`) isn't writable in this sandbox. Use `npm_config_cache=<scratchpad>/npm-cache npm install`.
- `functions/.env` holds parameter defaults (`SCHEDULE_TZ`, `API_MIN_INSTANCES`). Without it, the emulator stops to prompt for them.
- Emulators run on the `demo-meridian` project id, so no real Firebase project is needed.
