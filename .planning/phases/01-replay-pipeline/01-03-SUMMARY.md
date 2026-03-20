---
phase: 01-replay-pipeline
plan: 03
subsystem: api
tags: [opendota, bullmq, parser, ndjson, replay-pipeline, prisma, next.js]

# Dependency graph
requires:
  - phase: 01-replay-pipeline/01-01
    provides: "Project scaffold, Prisma schema, Redis singleton, validation, test framework"
  - phase: 01-replay-pipeline/01-02
    provides: "Steam GC spike result: FAILED -- OpenDota-only pipeline"
provides:
  - "OpenDota API client with getMatch, isReplayLikelyExpired"
  - "Replay URL construction utility (constructReplayUrl)"
  - "Parser client with parseReplay and parseNdjson"
  - "BullMQ queue (replayQueue) with ReplayJobData interface"
  - "Replay worker: download->parse->store pipeline (separate process)"
  - "POST /api/matches/:matchId endpoint (submit match for analysis)"
  - "GET /api/matches/:matchId endpoint (retrieve match data/status)"
  - "20 unit tests covering all client libraries"
affects: [01-replay-pipeline/01-04, 01-replay-pipeline/01-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [opendota-client, parser-ndjson, bullmq-worker-process, replay-pipeline-stages]

key-files:
  created:
    - src/lib/opendota.ts
    - src/lib/parser.ts
    - src/lib/replay-url.ts
    - src/lib/queue.ts
    - src/workers/replay-worker.ts
    - src/app/api/matches/[matchId]/route.ts
    - tests/unit/opendota.test.ts
    - tests/unit/parser.test.ts
    - tests/unit/parse-events.test.ts
    - tests/unit/replay-url.test.ts
    - tests/unit/replay-expiry.test.ts
  modified:
    - src/lib/redis.ts
    - src/app/api/jobs/[jobId]/status/route.ts

key-decisions:
  - "OpenDota-only replay URL source -- no GC fallback per 01-02 spike result"
  - "Export redisConnectionOptions for BullMQ to avoid ioredis version mismatch"
  - "parseNdjson exported as separate utility for testability and reuse"

patterns-established:
  - "OpenDota client: typed interfaces for API responses, throw on non-200"
  - "Parser client: ndjson parsing with graceful malformed line skipping"
  - "Worker process: stage-based progress updates (downloading/parsing/storing/complete)"
  - "API deduplication: use matchId as BullMQ jobId to prevent duplicate jobs"

requirements-completed: [PIPE-01, PIPE-02, PIPE-03]

# Metrics
duration: 5min
completed: 2026-03-20
---

# Phase 1 Plan 03: Backend Pipeline Summary

**OpenDota client, odota/parser client, BullMQ replay worker, and match API endpoint -- full pipeline from Match ID to parsed data in PostgreSQL**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-20T12:58:15Z
- **Completed:** 2026-03-20T13:03:56Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- OpenDota API client with typed match/player interfaces, expiry detection, and error handling
- Parser client with ndjson parsing, 200/204/500 response handling, and 5-minute timeout
- BullMQ replay worker processing jobs through download -> parse -> store stages with progress updates
- API endpoint with POST (submit + deduplicate) and GET (status/results) for match analysis
- 20 new unit tests (31 total) all passing with TDD workflow

## Task Commits

Each task was committed atomically:

1. **Task 1: OpenDota client, parser client, replay URL utilities, and event structure tests (TDD)**
   - RED: `155e9eb` (test) - Failing tests for all 5 test files
   - GREEN: `e2c21a0` (feat) - Implementation making all 20 tests pass
2. **Task 2: BullMQ queue, worker process, API endpoint, and data storage** - `d88f19e` (feat)

## Files Created/Modified
- `src/lib/opendota.ts` - OpenDota API client with getMatch, isReplayLikelyExpired, typed interfaces
- `src/lib/parser.ts` - Parser client with parseReplay (200/204/500 handling), parseNdjson utility
- `src/lib/replay-url.ts` - constructReplayUrl from cluster/matchId/replaySalt
- `src/lib/queue.ts` - BullMQ queue definition with ReplayJobData, 3 retries, exponential backoff
- `src/lib/redis.ts` - Added redisConnectionOptions export for BullMQ compatibility
- `src/workers/replay-worker.ts` - Standalone worker: OpenDota fetch -> parser parse -> PostgreSQL store
- `src/app/api/matches/[matchId]/route.ts` - POST (submit/deduplicate) and GET (status/results) endpoints
- `src/app/api/jobs/[jobId]/status/route.ts` - Fixed ioredis connection import
- `tests/unit/opendota.test.ts` - 3 tests: fetch URL, error handling, missing replay_url
- `tests/unit/parser.test.ts` - 5 tests: 200/204/500 responses, timeout, URL encoding
- `tests/unit/parse-events.test.ts` - 7 tests: fixture validation, ndjson parsing, malformed lines
- `tests/unit/replay-url.test.ts` - 2 tests: URL construction with different parameters
- `tests/unit/replay-expiry.test.ts` - 3 tests: expired, recent, boundary condition

## Decisions Made
- **OpenDota-only pipeline:** Per 01-02 spike result, worker throws clear error when OpenDota lacks replay URL instead of attempting GC fallback
- **redisConnectionOptions pattern:** BullMQ bundles its own ioredis (5.9.3) which conflicts with our installed version (5.10.1). Exporting plain connection options object avoids the type mismatch.
- **parseNdjson as exported utility:** Separated ndjson parsing from the fetch logic for independent testing and potential reuse

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed ioredis version mismatch between BullMQ and project**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** BullMQ bundles ioredis 5.9.3 internally, but project has ioredis 5.10.1. Redis instance type from our ioredis is incompatible with BullMQ's expected connection type.
- **Fix:** Added `redisConnectionOptions` export to redis.ts that provides a plain options object instead of a Redis instance. Updated queue.ts, worker.ts, and jobs/status/route.ts to use it.
- **Files modified:** src/lib/redis.ts, src/lib/queue.ts, src/workers/replay-worker.ts, src/app/api/jobs/[jobId]/status/route.ts
- **Verification:** `npx tsc --noEmit` passes with 0 errors
- **Committed in:** d88f19e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix necessary for TypeScript compilation. No scope creep.

## Issues Encountered
- Test for URL encoding initially failed due to vitest module caching with dynamic imports -- the fetch mock from a prior test was being read instead of the current test's mock. Fixed by reading the last mock call instead of the first.

## User Setup Required
None - no external service configuration required. Docker Compose (from Plan 01-01) provides PostgreSQL, Redis, and parser services.

## Next Phase Readiness
- Pipeline backend is complete, ready for frontend integration (Plan 01-04)
- Worker starts with `npx tsx src/workers/replay-worker.ts`
- API endpoints ready for status page integration
- All 31 unit tests green, TypeScript compiles clean

## Self-Check: PASSED

- [x] src/lib/opendota.ts exists
- [x] src/lib/parser.ts exists
- [x] src/lib/replay-url.ts exists
- [x] src/lib/queue.ts exists
- [x] src/workers/replay-worker.ts exists
- [x] src/app/api/matches/[matchId]/route.ts exists
- [x] tests/unit/opendota.test.ts exists
- [x] tests/unit/parser.test.ts exists
- [x] tests/unit/parse-events.test.ts exists
- [x] tests/unit/replay-url.test.ts exists
- [x] tests/unit/replay-expiry.test.ts exists
- [x] Commit 155e9eb exists (RED)
- [x] Commit e2c21a0 exists (GREEN)
- [x] Commit d88f19e exists (Task 2)
- [x] 31 tests pass
- [x] TypeScript compiles with 0 errors

---
*Phase: 01-replay-pipeline*
*Completed: 2026-03-20*
