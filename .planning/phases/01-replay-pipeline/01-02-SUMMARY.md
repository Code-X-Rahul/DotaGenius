---
phase: 01-replay-pipeline
plan: 02
subsystem: infra
tags: [steam, game-coordinator, spike, replay-acquisition, opendota]

# Dependency graph
requires:
  - phase: 01-replay-pipeline/01-01
    provides: "Project scaffolding, tsconfig, dependencies"
provides:
  - "Steam GC spike result: FAILED -- pipeline ships OpenDota-only"
  - "Steam GC client library (src/lib/steam-gc.ts) for reference"
  - "Steam bot setup documentation"
  - "Decision: No GC fallback in Plan 03"
affects: [01-replay-pipeline/01-03]

# Tech tracking
tech-stack:
  added: [steam-user, dota2-user, tsx]
  patterns: []

key-files:
  created:
    - src/lib/steam-gc.ts
    - scripts/gc-spike.ts
    - docs/steam-bot-setup.md
  modified: []

key-decisions:
  - "Steam GC spike failed -- pipeline ships with OpenDota-only, no GC fallback"
  - "Plan 01-03 will NOT include Steam GC integration"

patterns-established: []

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 1 Plan 02: Steam GC Spike Summary

**Steam GC spike built and tested -- GC connection failed, pipeline confirmed OpenDota-only with no GC fallback**

## Performance

- **Duration:** 4 min (across two sessions with checkpoint)
- **Started:** 2026-03-20T12:19:00Z
- **Completed:** 2026-03-20T12:23:44Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Built Steam GC client library with getReplaySalt export using steam-user and dota2-user
- Created standalone spike script runnable via `npx tsx scripts/gc-spike.ts <matchId>`
- Documented Steam bot account setup in docs/steam-bot-setup.md
- Tested spike with real credentials -- GC connection failed
- Confirmed decision: ship OpenDota-only, no GC fallback in Plan 03

## Task Commits

Each task was committed atomically:

1. **Task 1: Build Steam GC spike script and client library** - `3325d31` (feat)
2. **Task 2: Verify Steam GC spike results** - checkpoint:human-verify (no code commit -- documentation only)

## Files Created/Modified
- `src/lib/steam-gc.ts` - Steam GC client with getReplaySalt function (reference code, not used in production pipeline)
- `scripts/gc-spike.ts` - Standalone spike script for Steam GC validation
- `docs/steam-bot-setup.md` - Instructions for Steam bot account creation and credentials setup

## Decisions Made
- **Steam GC spike failed:** The Game Coordinator connection did not work reliably. Per user decision made before the spike, this means the pipeline ships with OpenDota as the sole replay URL source.
- **No GC fallback in Plan 03:** Plan 01-03 (backend pipeline) will implement OpenDota-only replay acquisition. The Steam GC code remains in the repo as reference but is not integrated into the production pipeline.
- **Impact:** Matches that OpenDota hasn't parsed will not have replay URLs available. This is an acceptable trade-off for v1 -- the vast majority of matches are available through OpenDota.

## Deviations from Plan

None - plan executed exactly as written. The spike was designed to produce a go/no-go decision, and the result was "no-go."

## Issues Encountered
- Steam GC connection failed during human verification. This was an expected possible outcome -- the entire purpose of the spike was to de-risk this path before committing to implementation.

## User Setup Required

None - no external service configuration required for the pipeline going forward (OpenDota API does not require authentication for basic usage).

## Next Phase Readiness
- Plan 01-03 should implement OpenDota-only replay acquisition
- The Steam GC blocker in STATE.md can be resolved -- spike completed, decision made
- OpenDota API rate limits (60 req/min without API key) should be respected in Plan 03

## Self-Check: PASSED

- [x] src/lib/steam-gc.ts exists
- [x] scripts/gc-spike.ts exists
- [x] docs/steam-bot-setup.md exists
- [x] 01-02-SUMMARY.md exists
- [x] Commit 3325d31 exists

---
*Phase: 01-replay-pipeline*
*Completed: 2026-03-20*
