---
phase: 01-replay-pipeline
plan: 04
subsystem: ui
tags: [next.js, react, tailwind, sse, eventsource, bullmq, localStorage]

# Dependency graph
requires:
  - phase: 01-replay-pipeline/01-01
    provides: Next.js scaffold, validation, layout, Tailwind, Redis singleton
provides:
  - Landing page with hero section, match ID search bar, and recent analyses
  - Status page with real-time SSE pipeline progress (downloading -> parsing -> complete)
  - SSE endpoint for job status streaming via BullMQ queue polling
  - StatusTimeline visual component for pipeline stages
  - useJobStatus hook for EventSource lifecycle management
  - useRecentMatches hook for localStorage match history
  - MatchIdInput component with client-side validation
  - RecentAnalyses component with localStorage history and popular placeholder
affects: [01-05, 02-analysis-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [sse-polling-via-bullmq-queue, eventsource-hook, localstorage-recent-matches, dark-gaming-theme]

key-files:
  created:
    - src/components/MatchIdInput.tsx
    - src/components/RecentAnalyses.tsx
    - src/components/StatusTimeline.tsx
    - src/hooks/useJobStatus.ts
    - src/hooks/useRecentMatches.ts
    - src/app/match/[matchId]/page.tsx
  modified:
    - src/app/page.tsx
    - src/app/layout.tsx
    - src/app/globals.css
    - src/app/api/jobs/[jobId]/status/route.ts

key-decisions:
  - "Used polling (1s interval) over QueueEvents for SSE -- avoids extra Redis connection and ioredis version conflicts"
  - "Dark gaming theme with CSS custom properties for consistent theming across components"
  - "Popular analyses uses placeholder data -- real endpoint can be wired later"

patterns-established:
  - "SSE via ReadableStream + setInterval polling on BullMQ Queue.getJob()"
  - "useJobStatus hook: EventSource with auto-reconnect and 3-failure error threshold"
  - "useRecentMatches: localStorage with max 20 entries, deduplication by matchId"
  - "Error categorization: expired / unavailable / parse_failed / download_failed"

requirements-completed: [PIPE-01]

# Metrics
duration: 6min
completed: 2026-03-20
---

# Phase 1 Plan 4: Frontend (Landing + Status Pages) Summary

**Landing page with dark gaming theme, match ID search with validation, and status page with real-time SSE pipeline progress via BullMQ polling**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-20T12:58:10Z
- **Completed:** 2026-03-20T13:03:55Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Landing page with hero section (gradient background, DotaGenius branding), prominent match ID search bar with client-side validation, and dual recent analyses sections (localStorage + popular placeholder)
- Status page with real-time pipeline progress via SSE showing submitted/downloading/parsing/complete stages
- SSE endpoint that polls BullMQ job state every 1 second and streams progress changes to EventSource clients
- Error state handling with categorized messages (replay expired, unavailable, parse failed, download failed) and actionable links
- Completed match summary view with re-analyze button
- Dark gaming-themed UI with CSS custom properties for accent colors, card backgrounds, and status indicators

## Task Commits

Each task was committed atomically:

1. **Task 1: Landing page with hero section, match ID input, and recent analyses** - `aa90f7c` (feat)
2. **Task 2: Status page with SSE updates and job status endpoint** - `74f3e3d` (feat)

## Files Created/Modified
- `src/app/globals.css` - Dark theme CSS with custom properties (accent, card, status colors)
- `src/app/layout.tsx` - Updated metadata, forced dark mode, body styling
- `src/app/page.tsx` - Landing page with hero section, search bar, recent analyses
- `src/components/MatchIdInput.tsx` - Match ID input with validation, loading state, API submission
- `src/components/RecentAnalyses.tsx` - localStorage history + popular placeholder with time-ago formatting
- `src/components/StatusTimeline.tsx` - Visual pipeline stepper (submitted/downloading/parsing/complete)
- `src/hooks/useRecentMatches.ts` - localStorage read/write for recent match entries (max 20)
- `src/hooks/useJobStatus.ts` - EventSource hook with reconnection handling and 3-failure threshold
- `src/app/match/[matchId]/page.tsx` - Status/results page with SSE progress, error states, re-analyze
- `src/app/api/jobs/[jobId]/status/route.ts` - SSE endpoint polling BullMQ queue for job progress

## Decisions Made
- Used polling (1s interval via setInterval) instead of BullMQ QueueEvents for the SSE endpoint. QueueEvents requires a separate Redis connection which causes ioredis version conflicts between the project's ioredis and BullMQ's bundled version. Polling on Queue.getJob() reuses the existing connection options pattern.
- Applied dark gaming theme via CSS custom properties rather than Tailwind dark: variants. This allows consistent theming without relying on prefers-color-scheme media queries.
- Popular analyses section uses placeholder data for now. The real endpoint can be wired when match history accumulates.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used redisConnectionOptions instead of redisConnection for BullMQ Queue**
- **Found during:** Task 2 (SSE endpoint)
- **Issue:** BullMQ's bundled ioredis types are incompatible with the project's ioredis instance. Passing the Redis instance directly caused TS2322 type errors.
- **Fix:** Used the `redisConnectionOptions` plain object (already established in plan 01-03's queue.ts) which passes host/port/password/db as plain values, avoiding type conflicts.
- **Files modified:** src/app/api/jobs/[jobId]/status/route.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** 74f3e3d (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary to match the existing pattern in queue.ts. No scope creep.

## Issues Encountered
- SSE endpoint already existed from plan 01-03 (commit d88f19e). The plan expected this file to be created, but it was already present with the same polling pattern. No changes were needed beyond the import fix.
- The matches API route (src/app/api/matches/[matchId]/route.ts) and queue.ts (src/lib/queue.ts) also already existed from plan 01-03, which wasn't reflected in STATE.md's completed count. Frontend components correctly reference these existing API routes.

## User Setup Required
None - no external service configuration required. Frontend components work with existing API routes.

## Next Phase Readiness
- Frontend is complete for the replay pipeline flow
- Landing page -> submit match ID -> status page -> results view flow is wired end-to-end
- Plan 01-05 can build on this for any remaining pipeline integration
- Phase 2 (analysis UI) can extend the match page with detailed analysis views

## Self-Check: PASSED

All 10 files verified present. Both task commits (aa90f7c, 74f3e3d) verified in git log.

---
*Phase: 01-replay-pipeline*
*Completed: 2026-03-20*
