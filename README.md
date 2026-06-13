# 🏏 CRICOS — Offline-first Cricket Scorer

A fast, fully-offline cricket scoring app for casual and serious matches.
React Native + Expo (Expo Router), TypeScript strict mode, Zustand, AsyncStorage.

## Run it

```bash
cd cricket-scorer
npm install --legacy-peer-deps   # see note below
npm start                        # then press "a" for Android, or scan the QR in Expo Go
```

- **Android:** `npm run android` (emulator or a device with Expo Go / a dev build).
- The app is portrait-only and dark-themed.

> **Why `--legacy-peer-deps`?** React Native 0.85 / React 19.2 are very new and a
> few libraries still declare older peer ranges. `--legacy-peer-deps` lets npm
> install the Expo-verified versions without false peer-conflict errors. Always
> use it in this project. `react-native-worklets` is pinned explicitly so it is
> never pruned (Reanimated 4 needs it + its Babel plugin).

## What's implemented

| Build step | Status |
|---|---|
| Project setup + Expo Router navigation | ✅ |
| TypeScript domain types (`types/cricket.ts`) | ✅ |
| Cricket scoring engine (`utils/cricket.ts`) | ✅ |
| Zustand stores (match / history / practice) | ✅ |
| Home dashboard + resume live match | ✅ |
| New Match setup (formats, toss, 8 rule toggles, templates) | ✅ |
| Live Scoring (extras, wickets, undo×6, haptics, voice, celebrations) | ✅ |
| Scorecard + WhatsApp/Instagram share (image + text) | ✅ |
| Match History (filter + search) | ✅ |
| Player career stats | ✅ |
| Practice mode (solo drills) | ✅ |
| Match templates ("Sunday Colony Match") | ✅ |
| **Clubs** — persistent rosters, career stats, honours | ✅ |
| **Tournaments** — points table w/ NRR, fixtures, champion | ✅ |
| **MVP** — per-match + tournament leaderboard (bat/bowl/field) | ✅ |
| **Hall of Fame** — all-time records board | ✅ |

### Cricket logic covered
- Wides / no-balls (extra run, ball not counted) and byes / leg-byes (ball counted).
- Strike rotation by run parity + end-of-over swap.
- Over completion auto-detect, new-bowler prompt, **no consecutive overs** rule,
  per-bowler over cap (unless "Unlimited overs" is on).
- All-out / overs-complete / target-chased innings ends; **Last Man Stands** support.
- Maidens, economy, strike rate, partnerships, CRR, required run rate, projected score.
- Result calc: "won by X runs" / "won by X wickets" / "Match Tied".
- Smart undo: full match snapshots, up to 6 balls back, everything recomputes.
- Retired (not out) batters can return.

## Deliberate deviations from the original spec

1. **Expo SDK 56 instead of 51.** Your machine runs Node 24, which the SDK 51
   toolchain (RN 0.74) doesn't support. SDK 56 (RN 0.85 / React 19.2) builds
   cleanly. Every dependency and feature you asked for is present.
2. **StyleSheet + a centralized theme (`constants/theme.ts`) instead of NativeWind.**
   NativeWind v4 relies on RN internals not yet proven against RN 0.85 / React 19,
   and a mismatch there breaks the whole bundle. The theme produces pixel-identical
   results to your palette and is zero-config. Easy to add NativeWind later.

## Known limitations / next steps

- **Shared co-scoring (6-digit code):** the code is generated and shown on the
  scoring screen, but live cross-device sync needs a backend or local-network
  channel and is intentionally **not** wired up in this offline-first MVP. It's the
  natural next feature (e.g. a tiny sync server or WebRTC/LAN broadcast).
- **Wagon wheel:** exposed as an (off-by-default) rule toggle as specified; the
  shot-direction capture UI itself is not built yet.
- Monetization tiers are documented in the spec but not gated in-app.

## Project structure

```
app/        Expo Router screens (index, new-match, scoring/[id], scorecard/[id],
            history, practice, player/[id], _layout)
components/  ui kit, Header, MatchCard, scoring/* and scorecard/* widgets
store/       matchStore, historyStore, practiceStore (Zustand)
utils/       cricket (engine), calculations, share, storage
types/       cricket.ts (all domain types)
constants/   theme.ts, formats.ts
```

## Verified

- `npx tsc --noEmit` — passes (strict mode, incl. Expo Router typed routes).
- `npx expo export --platform android` — bundles successfully.
