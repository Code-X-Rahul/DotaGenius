---
phase: 02-match-overview
plan: 01
subsystem: api, data-layer
tags: [dotaconstants, recharts, dota2, typescript, vitest, next-image]

# Dependency graph
requires:
  - phase: 01-replay-pipeline
    provides: "Prisma schema with Player/Match models, API route skeleton, worker pipeline"
provides:
  - "Hero/item/lobby/region lookup functions with CDN image URLs (dota-constants.ts)"
  - "Match data transform utilities: team splitting, CS@10, lane classification, graph data (match-utils.ts)"
  - "TypeScript interfaces for API response and component props (match-types.ts)"
  - "Focus player selection hook (useFocusPlayer.ts)"
  - "Expanded GET /api/matches/:matchId with all Phase 2 fields"
  - "Steam CDN image configuration in next.config.ts"
  - "43 unit tests covering constants, utils, and API serialization"
affects: [02-match-overview, 03-visualizations, 04-ai-analysis]

# Tech tracking
tech-stack:
  added: [recharts@^3.8, dotaconstants@10.7.0]
  patterns: [inverted-index-item-lookup, team-splitting-by-isRadiant, benchmark-color-coding, advantage-data-transform]

key-files:
  created:
    - src/lib/dota-constants.ts
    - src/lib/match-utils.ts
    - src/lib/match-types.ts
    - src/hooks/useFocusPlayer.ts
    - tests/unit/dota-constants.test.ts
    - tests/unit/match-utils.test.ts
    - tests/unit/match-api.test.ts
  modified:
    - src/app/api/matches/[matchId]/route.ts
    - next.config.ts
    - package.json

key-decisions:
  - "Import dotaconstants via ESM named exports (heroes, items, cluster, region) not subpath imports"
  - "Build inverted item index (id -> data) at module load for O(1) lookups"
  - "Use cluster.json -> region.json two-step lookup for region names"
  - "Lobby type names cleaned from 'lobby_type_normal' to 'Normal' format"

patterns-established:
  - "Dota constants lookup: always use src/lib/dota-constants.ts, never import dotaconstants directly"
  - "Match data transforms: always use src/lib/match-utils.ts for team/lane/graph operations"
  - "Type contracts: all components import from src/lib/match-types.ts"
  - "CDN images: Steam CDN configured in next.config.ts, use getHero/getItem for URLs"

requirements-completed: [MATC-01, MATC-02, MATC-03]

# Metrics
duration: 6min
completed: 2026-03-20
---

# Phase 02 Plan 01: Data Layer & API Foundation Summary

**Dota constants lookups, match data transforms, TypeScript type contracts, expanded API route with all Phase 2 fields, and 43 unit tests**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-20T16:54:39Z
- **Completed:** 2026-03-20T17:00:11Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Installed recharts and dotaconstants; created typed hero/item/lobby/region lookup module with CDN image URLs and inverted item index
- Built match utility functions for team splitting, CS@10 extraction, lane classification, advantage graph data transforms, per-player gold data, and benchmark color coding
- Expanded GET /api/matches/:matchId to return all Phase 2 player fields (laning, time-series, benchmarks, detail logs) and match-level fields (scores, advantage arrays, objectives)
- Configured next.config.ts for Steam CDN image optimization
- 43 unit tests all passing: 37 for constants/utils, 6 for API serialization

## Task Commits

Each task was committed atomically:

1. **Task 1: Install deps, create dota-constants, match-utils, types, focus player hook** - `04ea5ca` (feat)
2. **Task 2: Expand API route, configure CDN images, add API tests** - `af8e6d7` (feat)

## Files Created/Modified
- `src/lib/match-types.ts` - TypeScript interfaces: PlayerData, MatchResponse, AdvantagePoint, PerPlayerPoint, ObjectiveEvent, HeroInfo, ItemInfo
- `src/lib/dota-constants.ts` - Hero/item/lobby/region lookups with CDN URLs, inverted item index
- `src/lib/match-utils.ts` - Team splitting, CS@10, lane classification, advantage/per-player graph data, benchmark colors
- `src/hooks/useFocusPlayer.ts` - Focus player toggle state hook
- `src/app/api/matches/[matchId]/route.ts` - Expanded with all Phase 2 player and match fields
- `next.config.ts` - Steam CDN remote pattern for next/image
- `package.json` - Added recharts and dotaconstants dependencies
- `tests/unit/dota-constants.test.ts` - 16 tests for hero/item/lobby/region lookups
- `tests/unit/match-utils.test.ts` - 21 tests for data transforms
- `tests/unit/match-api.test.ts` - 6 tests for API response serialization

## Decisions Made
- Imported dotaconstants via ESM named exports (`import { heroes, items } from "dotaconstants"`) because the package only exports `./index.js`, not subpath `./build/*.json`
- Built inverted item index (`Record<number, ItemInfo>`) at module load since items are keyed by string name but player data stores numeric IDs
- Used two-step cluster -> region lookup: `cluster.json` maps cluster ID to region ID, `region.json` maps region ID to name
- Cleaned lobby type names by stripping `lobby_type_` prefix and title-casing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error with dotaconstants item cost null type**
- **Found during:** Task 2 (TypeScript compilation check)
- **Issue:** Some items in dotaconstants have `cost: null` which is incompatible with `cost?: number` type assertion
- **Fix:** Changed type cast to use `unknown` intermediate and `cost?: number | null`
- **Files modified:** src/lib/dota-constants.ts
- **Verification:** `npx tsc --noEmit` passes with 0 errors
- **Committed in:** af8e6d7 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor type fix necessary for TypeScript correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed type issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All type contracts, data transforms, and API fields ready for UI component development
- Plans 02 and 03 can import from match-types.ts, dota-constants.ts, and match-utils.ts
- Recharts installed and ready for graph components
- Steam CDN configured for hero/item image rendering

---
*Phase: 02-match-overview*
*Completed: 2026-03-20*
