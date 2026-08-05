# Nonogram Gameplay Parity with Sudoku/CrossMath/Tangram

**Goal:** Make nonogram API + workflows identical to the other 3 games — full guest support (play, save, complete, abandon, daily), daily session lifecycle, correct models, rate limits, guest transfer, dedicated puzzle routes.

Reference pattern: `sudoku` (route-helpers), `tangram` (guest daily branches), `crossmath` (actor services). All three use Actor `{user}|{guest}` via `x-guest-id`.

## Scope

1. **Auth/identity** — `nonogram/route-helpers.ts` gains Actor union + `x-guest-id` fallback. `useNonogram.ts` drops token-abort, uses `ensureGuestId()`.
2. **Model** — `NonogramPlaySession`: `userId` optional, add `guestId`/`gameType`/`dailyChallengeId`, unique partial indexes, guest indexes. In-place migration script ($set defaults, non-destructive).
3. **Services** — actor-based owner checks, 90d prune on continue, auto-complete solved boards on continue.
4. **Routes** — new `puzzle/`, `puzzle/[id]/`, `puzzles/` (folder), `daily/sessions`, `daily/continue`, `daily/completion`. Guest gates on stats/complete/abandon/daily-history/daily-stats. Fix `completed` route wrong model. Rate limits.
5. **Guest transfer** — add nonogram to `guestTransfer.ts`.
6. **Client** — daily flow via `daily/sessions` + `daily/continue` + `daily/completion`.

## Not in scope

- Sudoku/crossmath/tangram untouched.
- No new difficulty/sizes (easy/medium/hard stay).
- Legacy `/api/v1/crossmath` not replicated (dead code).

## File map

| File | Change |
|---|---|
| `src/app/api/v1/games/nonogram/route-helpers.ts` | Actor union, guest fallback, connectDB-first |
| `src/lib/server/models/NonogramPlaySession.ts` | guestId/gameType/dailyChallengeId, indexes |
| `scripts/migrate-nonogram-sessions.ts` | defaults on existing docs |
| `src/lib/server/puzzles/nonogram/services/SessionService.ts` | actor ops, prune, auto-complete |
| `src/lib/server/puzzles/nonogram/services/PlaySessionRepository.ts` | owner filter by actor |
| `src/lib/server/puzzles/nonogram/services/RandomPuzzleEngine.ts` | owner detection (userId\|guestId) |
| `src/lib/server/puzzles/nonogram/services/StatisticsService.ts` | guest-aware stats calc (tangram-style) |
| `src/app/api/v1/games/nonogram/puzzle/route.ts` | NEW guest-aware random puzzle |
| `src/app/api/v1/games/nonogram/puzzle/[id]/route.ts` | NEW puzzle by id |
| `src/app/api/v1/games/nonogram/puzzles/route.ts` | NEW (replaces flat `puzzles.route.ts`) |
| `src/app/api/v1/games/nonogram/daily/sessions/route.ts` | NEW |
| `src/app/api/v1/games/nonogram/daily/continue/route.ts` | NEW |
| `src/app/api/v1/games/nonogram/daily/completion/route.ts` | NEW guest-aware |
| `src/app/api/v1/games/nonogram/daily/history/route.ts` | guest branch |
| `src/app/api/v1/games/nonogram/daily/stats/route.ts` | guest branch (tangram streaks) |
| `src/app/api/v1/games/nonogram/stats/route.ts` | guest → null |
| `src/app/api/v1/games/nonogram/completed/route.ts` | fix model → NonogramPlaySession |
| `src/app/api/v1/games/nonogram/sessions/[id]/complete/route.ts` | guest skips stats/bus/DailyChallenge |
| `src/app/api/v1/games/nonogram/sessions/[id]/abandon/route.ts` | guest skips stats |
| all nonogram routes | rate-limit additions (verify/continue/daily-*) |
| `src/lib/server/utils/guestTransfer.ts` | add nonogram |
| `src/hooks/useNonogram.ts` | guest flow + daily session flow |
| `src/lib/api/gameApi.ts` | ensure nonogram daily helpers wired |
| `src/test/*` | guest session tests |

## Verification

- `npm run db:seed` + migration
- py dataset validator (unchanged)
- `npx tsc --noEmit`, `npx vitest run`
- Browser smoke: guest (incognito, no token) start/save/abandon + logged-in full flow + daily