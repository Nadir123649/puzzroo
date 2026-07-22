# Cross Math Backend — Architecture & Implementation

## Overview

Complete production-grade refactoring of the Cross Math puzzle backend. Replaced generic shared puzzle routes with a dedicated service-oriented architecture following the established Nonogram pattern.

## Audit Summary

- **3 difficulties:** easy (7×7), medium (11×11), hard (11×11)
- **3,000 puzzles total** (1,000 per difficulty)
- **17 patterns** (5 easy, 6 medium, 6 hard)
- **Operators:** `+` and `-` only
- **Issues fixed:** solution leaked in puzzle response, no session system, incorrect `meta.json`, duplicate files, dead `size` field, broken index

## Architecture

### Directory Structure

```
src/lib/server/puzzles/crossmath/
├── index.ts
├── types.ts
├── validators.ts
├── services/
│   ├── SessionService.ts
│   ├── VerificationEngine.ts
│   ├── StatisticsService.ts
│   ├── RandomPuzzleEngine.ts
│   └── PlaySessionRepository.ts

src/app/api/v1/games/crossmath/
├── puzzle/
│   ├── route.ts
│   └── [puzzleId]/route.ts
├── daily/route.ts
├── sessions/
│   ├── route.ts
│   └── [sessionId]/
│       ├── route.ts
│       ├── pause/route.ts
│       ├── resume/route.ts
│       ├── save/route.ts
│       ├── autosave/route.ts
│       ├── verify/route.ts
│       ├── complete/route.ts
│       ├── abandon/route.ts
│       ├── restart/route.ts
│       └── replay/route.ts
├── recent/route.ts
├── history/route.ts
├── completed/route.ts
├── stats/route.ts
└── continue/route.ts
```

### New Collections

| Collection | Purpose |
|-----------|---------|
| `CrossMathPlaySession` | Session lifecycle (active/paused/completed/abandoned) |

### Session Lifecycle

```
START → ACTIVE → PAUSED → ACTIVE → COMPLETED
                         → ACTIVE → ABANDONED
                         → RESTARTED
                         → REPLAYED
```

State machine enforced server-side. Illegal transitions rejected.

### Verification Engine

Backend-authoritative equation validation. Frontend submits grid values as `Record<string, number>`. Backend reconstructs equations from pattern, evaluates left-to-right, tracks mistakes against stored solution, determines completion.

### Random Puzzle Engine

Intelligent selection excluding completed, active, and recently abandoned puzzles. Falls back to random if filtered pool is empty.

### Security Fix

- `solution` field **removed** from all puzzle responses
- Session ownership enforced on every endpoint
- State transition validation rejects illegal moves

## API Endpoints (20 total)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/games/crossmath/puzzle` | Random puzzle (filtered) |
| GET | `/api/v1/games/crossmath/puzzle/[id]` | Puzzle by ID |
| GET | `/api/v1/games/crossmath/daily` | Daily puzzle (deterministic) |
| POST | `/api/v1/games/crossmath/sessions` | Start session |
| GET | `/api/v1/games/crossmath/sessions` | List sessions |
| GET | `/api/v1/games/crossmath/sessions/[id]` | Get session |
| POST | `/api/v1/games/crossmath/sessions/[id]/pause` | Pause |
| POST | `/api/v1/games/crossmath/sessions/[id]/resume` | Resume |
| POST | `/api/v1/games/crossmath/sessions/[id]/save` | Save progress |
| POST | `/api/v1/games/crossmath/sessions/[id]/autosave` | Autosave |
| POST | `/api/v1/games/crossmath/sessions/[id]/verify` | Verify grid (no complete) |
| POST | `/api/v1/games/crossmath/sessions/[id]/complete` | Complete + stats |
| POST | `/api/v1/games/crossmath/sessions/[id]/abandon` | Abandon + stats |
| POST | `/api/v1/games/crossmath/sessions/[id]/restart` | Restart fresh |
| POST | `/api/v1/games/crossmath/sessions/[id]/replay` | Replay puzzle |
| GET | `/api/v1/games/crossmath/recent` | Recent sessions |
| GET | `/api/v1/games/crossmath/history` | Paginated history |
| GET | `/api/v1/games/crossmath/completed` | Completed list |
| GET | `/api/v1/games/crossmath/stats` | Player statistics |
| GET | `/api/v1/games/crossmath/continue` | Continue playing |

## Changes to Existing Code

| File | Change |
|------|--------|
| `shared/src/data/crossmath/meta.json` | Fixed to list all 3 difficulties with correct counts |
| `src/data/crossmath/patterns.ts` | Deleted (duplicate of shared) |
| `src/lib/crossmath/types.ts` | Deleted (duplicate of shared) |
| `src/lib/crossmath/puzzleGenerator.ts` | Updated import to use shared path |
| `src/lib/server/puzzles/crossmath.ts` | Removed solution field from response |
| `src/lib/server/puzzles/types.ts` | Removed solution field from `CrossMathPuzzleResponse` |
| `src/lib/server/models/CrossMathPuzzle.ts` | Removed dead `size` field, added `game` field |
| `src/lib/server/seed/transform.ts` | Removed `size: 0`, added `game: "crossmath"` |
