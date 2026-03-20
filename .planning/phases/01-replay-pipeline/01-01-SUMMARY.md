---
phase: 01-replay-pipeline
plan: 01
subsystem: infra
tags: [next.js, prisma, redis, ioredis, bullmq, zod, vitest, docker, postgresql, tailwind]

# Dependency graph
requires: []
provides:
  - Next.js 15 App Router project scaffold with TypeScript and Tailwind
  - Prisma schema with Match, Player, CombatLogEvent, PositionSnapshot models
  - Prisma client singleton (src/lib/db.ts)
  - Redis connection singleton with BullMQ-compatible settings (src/lib/redis.ts)
  - Match ID validation with zod (src/lib/validation.ts)
  - Vitest test framework with path aliases
  - Docker Compose for PostgreSQL, Redis, and odota/parser
  - Test fixtures for OpenDota API responses and parser output
affects: [01-02, 01-03, 01-04, 01-05]

# Tech tracking
tech-stack:
  added: [next.js 16.2, prisma 6.19, ioredis 5.x, bullmq 5.x, zod 4.3, vitest 4.1, steam-user 5.x, dota2-user 2.x, node-cron 4.x]
  patterns: [prisma-singleton, redis-singleton-bullmq, zod-validation]

key-files:
  created:
    - prisma/schema.prisma
    - src/lib/db.ts
    - src/lib/redis.ts
    - src/lib/validation.ts
    - vitest.config.ts
    - docker-compose.yml
    - .env.example
    - tests/unit/validation.test.ts
    - tests/fixtures/opendota-match.json
    - tests/fixtures/parser-output.ndjson
  modified:
    - package.json
    - tsconfig.json

key-decisions:
  - "Used Prisma 6 instead of 7 -- Prisma 7 has breaking config changes (datasource url removed from schema.prisma)"
  - "Used zod v4 with zod/v4 import path"

patterns-established:
  - "Prisma singleton: globalThis caching for dev hot-reload"
  - "Redis singleton: maxRetriesPerRequest: null for BullMQ compatibility"
  - "Validation: zod schema + safeParse wrapper returning {valid, error}"

requirements-completed: [PIPE-03]

# Metrics
duration: 6min
completed: 2026-03-20
---

# Phase 1 Plan 1: Project Foundation Summary

**Next.js 15 scaffold with Prisma 4-model schema, Redis/BullMQ singleton, zod validation, Vitest, and Docker Compose for PostgreSQL + Redis + parser**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-20T11:53:04Z
- **Completed:** 2026-03-20T11:59:35Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments
- Next.js 15 project with App Router, TypeScript, Tailwind CSS, and all replay pipeline dependencies installed
- Prisma schema with 4 models (Match, Player, CombatLogEvent, PositionSnapshot) with proper indexes and relations
- Redis connection singleton configured for BullMQ compatibility (maxRetriesPerRequest: null)
- Match ID validation with zod (8-12 digit regex) with 11 passing tests
- Docker Compose providing PostgreSQL 16, Redis 7, and odota/parser services
- Test fixtures for OpenDota API responses and parser ndjson output

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js project with all dependencies and dev services** - `2b4f9af` (feat)
2. **Task 2: Database schema, client singletons, validation, and test infrastructure** - `eaaaa59` (feat)

## Files Created/Modified
- `package.json` - Project dependencies including bullmq, ioredis, prisma, zod, steam-user, dota2-user
- `prisma/schema.prisma` - Match, Player, CombatLogEvent, PositionSnapshot models with indexes
- `src/lib/db.ts` - Prisma client singleton with globalThis caching
- `src/lib/redis.ts` - ioredis connection with BullMQ-compatible settings
- `src/lib/validation.ts` - Match ID validation using zod regex schema
- `vitest.config.ts` - Test framework config with @/* path aliases
- `docker-compose.yml` - PostgreSQL 16, Redis 7, odota/parser services
- `.env.example` - DATABASE_URL, REDIS_URL, PARSER_URL, STEAM credentials
- `tests/unit/validation.test.ts` - 11 tests for matchIdSchema and validateMatchId
- `tests/fixtures/opendota-match.json` - Sample OpenDota API match response with 10 players
- `tests/fixtures/parser-output.ndjson` - Sample parser events (combat_log, hero_position, entity_state, metadata)
- `src/app/layout.tsx` - DotaGenius-branded root layout
- `src/app/page.tsx` - Placeholder landing page
- `tsconfig.json` - TypeScript configuration with @/* path aliases
- `.gitignore` - Node.js, Next.js, env files, replay files

## Decisions Made
- Used Prisma 6 instead of 7: Prisma 7.x has breaking changes where datasource `url` is no longer supported in schema.prisma (requires prisma.config.ts). Prisma 6 is stable and matches the research recommendation.
- Used zod v4 with `zod/v4` import path (zod 4.3.6 installed by default)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed auto-generated steam-gc.ts, scripts/, and docs/ directories**
- **Found during:** Task 1 verification (build)
- **Issue:** create-next-app auto-generated `src/lib/steam-gc.ts`, `scripts/gc-spike.ts`, and `docs/steam-bot-setup.md` from the scaffold's CLAUDE.md/AGENTS.md. These files referenced steam-user/dota2-user which lacked type definitions, causing build failures.
- **Fix:** Removed the auto-generated files as they are out of scope for this plan (steam GC is plan 01-02)
- **Files modified:** Removed src/lib/steam-gc.ts, scripts/gc-spike.ts, docs/steam-bot-setup.md
- **Verification:** `npm run build` succeeds after removal
- **Committed in:** 2b4f9af (Task 1 commit)

**2. [Rule 3 - Blocking] Downgraded Prisma from v7 to v6**
- **Found during:** Task 2 (prisma generate)
- **Issue:** Prisma 7.5.0 installed by default but v7 removed datasource `url` from schema.prisma, requiring a new prisma.config.ts approach
- **Fix:** Installed prisma@6 and @prisma/client@6 (v6.19.2)
- **Files modified:** package.json, package-lock.json
- **Verification:** `npx prisma generate` succeeds
- **Committed in:** eaaaa59 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary to unblock the build and Prisma generation. No scope creep.

## Issues Encountered
- create-next-app refused directory name "DotaGenius" due to npm naming restrictions (no capitals). Scaffolded to temp directory and copied files.

## User Setup Required
None - no external service configuration required. Docker Compose provides all local dev services.

## Next Phase Readiness
- Foundation is complete for Plans 02-05 to build upon
- Prisma schema ready for migration once PostgreSQL is running (`docker compose up`)
- Redis connection ready for BullMQ queue setup (Plan 03)
- Validation logic ready for API route integration (Plan 04)
- Test infrastructure ready for additional unit and integration tests

---
*Phase: 01-replay-pipeline*
*Completed: 2026-03-20*
