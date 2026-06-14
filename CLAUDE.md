@AGENTS.md

# CRICOS — Project Context (read this first)

> Durable memory for this project. If your context was trimmed, **start here.**
> Keep this file updated as the project evolves — status, decisions, gotchas.
> Last updated: 2026-06-13.

## What CRICOS is
A cricket scoring app, Android-first, built to beat CricHeroes & Stumps. Originally
offline-first; **now pivoting to an online, multi-user app** (logins, per-user UID,
shared stats). Owner is a non-expert who needs clear, guided steps for any action
that touches their accounts.

Project root: `C:\Users\DELL\OneDrive\Desktop\CRIC APP\cricket-scorer`
(the app lives in the `cricket-scorer/` subfolder because the parent "CRIC APP" has
a space, which `create-expo-app` rejects).

## Current status (2026-06-13)
- ✅ Full offline app built & verified (tsc strict + `expo export` pass).
- ✅ First APK built via EAS and installable.
- ✅ Code on GitHub: **github.com/sam02324/CRICOS** (branch `main`), build-on-push
  workflow at `.eas/workflows/build-on-push.yml` (needs repo linked in Expo dashboard).
- ✅ **Online Phase 1 wired.** Supabase project **`rfdajfdtvphigfhavvaj`** (Tokyo)
  live; `schema.sql` applied; **Google provider enabled** (client id/secret set via
  Management API); anon key + URL in EAS `preview` env + `.env`; redirect allow-list
  `cricos://auth/callback`. OAuth completes at `app/auth/callback.tsx`; `authStore`
  parses BOTH `?code=` and `#token` redirects (setSession / exchangeCodeForSession)
  with a global deep-link listener.
- 🐛 **Bug audit pass done** (before the latest build): fixed last-man-stands stall
  (engine null-end swap guards + store `consolidateLastMan` + screen gating on
  eligible batters), all-bowlers-disabled stall (relax over-cap), and lone-batter
  swap-strike blocking scoring. All `tsc` + `expo export` clean.
- ⏳ **Next:** owner installs the rebuilt APK, confirms Google login lands in-app,
  then Phase 2 (cloud data + shared stats). Revoke the management PAT when done.

## Tech stack & versions
- Expo **SDK 56** (RN 0.85.3, React 19.2.3), **Expo Router** (file-based), New Arch ON.
- TypeScript strict. Zustand stores. AsyncStorage (local cache).
- Reanimated 4.3.1 (+ react-native-worklets 0.8.3), expo-haptics, expo-speech,
  react-native-view-shot + expo-sharing.
- **Supabase** (`@supabase/supabase-js`) for cloud + auth; Google sign-in via
  `supabase.auth.signInWithOAuth` + `expo-web-browser` + `expo-auth-session` (PKCE).
- Styling = centralized theme + StyleSheet (`constants/theme.ts`). **No NativeWind.**

## ⚠️ Critical setup gotchas (read BEFORE installing or building)
- **Always `npm install --legacy-peer-deps`** (RN 0.85/React 19 peer ranges are noisy).
  An `.npmrc` with `legacy-peer-deps=true` is committed so EAS cloud installs also work.
- `react-native-worklets@0.8.3` is pinned as an explicit dep and `babel-preset-expo`
  as a devDep — a plain legacy-peer-deps reconcile once **pruned** them and broke the
  Metro/Babel build. Do not remove them.
- Babel uses `react-native-worklets/plugin` (Reanimated 4 moved it there); must be last.
- **Adding a new screen/route?** The typed-routes file (`.expo/types`) goes stale and
  `tsc` errors on the new route. Regenerate: run `npx expo start` briefly (it writes
  `.expo/types/router.d.ts`), then stop it, then `tsc`.

## Architecture
```
app/                Expo Router screens
  _layout.tsx       providers + auth gate (gates only when backend configured)
  login.tsx         Google sign-in
  index, new-match, scoring/[id], scorecard/[id], history, practice,
  player/[id], clubs, club/[id], tournaments, tournament/[id], hall-of-fame
components/         ui/ kit, Header, MatchCard, scoring/*, scorecard/*
store/              zustand: matchStore, historyStore, practiceStore,
                    clubStore, tournamentStore, authStore
utils/              cricket (engine), calculations, mvp, competition, share, storage
types/              cricket.ts, clubs.ts
constants/          theme.ts, formats.ts
lib/                supabase.ts (client), env.ts (EXPO_PUBLIC_* config)
supabase/           schema.sql (run in Supabase SQL editor)
```
- **Scoring engine** (`utils/cricket.ts`): `applyDelivery` mutates an innings draft;
  the store deep-clones into a 6-deep undo stack before each ball. Handles extras,
  strike rotation, over/innings completion, maidens, result calc.
- **Competition layer**: clubs (rosters + stats), tournaments (points table w/ NRR),
  MVP engine (`utils/mvp.ts`, fielding credited from dismissal fielderId), Hall of Fame.
- **Match type** has optional `team1ClubId`/`team2ClubId`/`tournamentId`.

## Key decisions & deviations (and WHY)
- **SDK 56, not the spec's 51** — owner's Node 24 can't run SDK 51's RN 0.74 toolchain.
- **StyleSheet + theme, not NativeWind** — NativeWind v4 unproven on RN 0.85/React 19;
  a mismatch breaks the whole bundle.
- **Expo Router, not bare React Navigation** — owner approved; folder tree matched it,
  and Expo Router runs on React Navigation v6 underneath.
- **Online via Supabase + Google** — owner's explicit choice. Local cache kept for
  smoothness, cloud is source of truth.
- **"Copy Stumps"** = match its feature set, but **original UI** (no pixel-cloning of
  proprietary design).

## External services & accounts
- **Expo / EAS:** account `rishabh-02`; project `@rishabh-02/cricos`
  (projectId in app.json `extra.eas.projectId`). Keystore is EAS-managed.
- **GitHub:** `sam02324`; repo `sam02324/CRICOS` (public). `gh` CLI installed at
  `C:\Program Files\GitHub CLI\gh.exe`.
- **Supabase:** project NOT created yet (owner's next action). Keys go in `.env`
  (local, gitignored) and EAS env vars (for builds) — never commit real keys.
- **Google OAuth:** not set up yet (Google Cloud client + Supabase Google provider).

## Build, deploy & verify
- Verify code: `npx tsc --noEmit` and `npx expo export --platform android` (both must pass).
- Build APK: `eas build -p android --profile preview` (internal-distribution APK).
  Free tier = queue + ~10-20 min native build; first build slowest (no cache).
- Auto-build: push to `main` → `.eas/workflows/build-on-push.yml` (once repo is linked
  in Expo dashboard: expo.dev/accounts/rishabh-02/projects/cricos/github).
- Interactive auth (eas login, gh auth login, Supabase/Google dashboards) is the
  **owner's** to do — guide them; don't try to harvest stored credentials.

## Roadmap
1. ✅ Auth foundation (Supabase + Google + profiles/UID + login gate).
2. ⏳ Cloud data layer (matches/clubs/tournaments/stats to cloud; shared profiles & leaderboards).
3. ⏳ Feature expansion (Stumps-equivalent feature set).
4. UI/UX overhaul (professional dark, no chrome emoji, iOS feel):
   - ✅ Wave 1: design system (theme + UI kit), Home, Login, MatchCard, typographic Celebration.
   - 🔨 Wave 2 (in progress): rich player profile (Overview/Statistics tabs, format table,
     recent form, Profile ID) DONE; app-wide emoji removed (clubs/tournaments/hall-of-fame/
     new-match/practice now use icons + colored monogram crests) DONE. STILL TODO: Match Centre
     tabs (Scoring/Scorecard/Stats/Super Stars), squad picker Playing/Bench, tournament banners,
     bespoke scoring-screen layout, club Hall of Fame per season.

## Conventions
- Match the surrounding code style; files have a top doc-comment explaining purpose.
- Theme tokens from `constants/theme.ts` — no hard-coded colors.
- Keep this file current: when status/decisions/gotchas change, update the relevant
  section and the "Last updated" date.
