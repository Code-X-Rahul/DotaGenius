# Phase 1: Replay Pipeline - Research

**Researched:** 2026-03-20
**Domain:** Dota 2 replay acquisition, parsing, async job processing, PostgreSQL storage
**Confidence:** MEDIUM-HIGH

## Summary

This phase builds the entire replay pipeline from Match ID input through parsed data in PostgreSQL. The pipeline has four distinct stages: (1) accept Match ID from user, (2) obtain the replay download URL via OpenDota API or Steam Game Coordinator, (3) download and parse the .dem file using the odota/parser Docker sidecar, and (4) store structured game data in PostgreSQL. BullMQ with Redis handles async job processing so the web server never blocks on long-running parse operations.

The critical discovery is that replay acquisition is a two-step process. OpenDota's `GET /matches/{match_id}` returns a `replay_url` field ONLY for matches that OpenDota has already parsed. For unparsed matches, the `replay_url` is absent. To get the replay download URL, you need the `cluster` and `replay_salt` values -- the cluster comes from the match data, but `replay_salt` must be fetched from the Dota 2 Game Coordinator via a Steam account. OpenDota handles this internally but Valve removed `replay_salt` from their public Web API years ago. This is why the Steam GC bot fallback (via `dota2-user`) exists, and why the CONTEXT.md calls for a proof-of-concept spike first.

**Primary recommendation:** Start with the Steam GC spike to validate replay salt acquisition. Build the pipeline around the odota/parser `/blob` endpoint which accepts a `replay_url` query parameter and handles download + decompression + parsing in one call, returning newline-delimited JSON events. Use BullMQ with a separate worker process (not inside Next.js) for job processing, and SSE from a Next.js route handler for real-time status updates.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Landing page has a hero section explaining DotaGenius at top, search bar, then recent analyses below
- Recent analyses section shows browser-local history (localStorage) on top, globally popular analyses below
- If a match was already analyzed, show cached results immediately with a "re-analyze" button
- After submitting a Match ID, redirect to a dedicated status page showing pipeline steps: downloading -> parsing -> complete
- Client-side validation on Match ID input (numeric, ~10 digits) before allowing submission
- OpenDota API is the primary source for replay URLs
- Steam Game Coordinator bot is the fallback -- validate with a proof-of-concept spike FIRST before building the rest of the pipeline
- If the GC spike fails (unreliable or rate-limited), ship with OpenDota-only and accept some matches won't be available
- Include a setup guide for creating a dedicated Steam bot account for GC access
- Expired replays: warn user if match is >10 days old ("replay may be unavailable") but still attempt download; fail gracefully if unavailable
- All game modes supported (All Pick, Turbo, Ability Draft, custom games -- everything)
- Invalid Match IDs caught client-side before submission
- Hero position, gold, and XP snapshots every 10 seconds during parsing
- Full combat log stored (every damage, heal, buff, item use, ability cast)
- All 10 players' data stored per match; user picks a "focus player" for AI analysis in later phases
- Original .dem files kept for 24-48 hours after parsing, then auto-deleted
- Parsed data stored in PostgreSQL for fast retrieval

### Claude's Discretion
- Parse failure UX (how to present corrupted files or unsupported data)
- Status page update mechanism (polling vs SSE vs websockets)
- Database schema design
- Exact .dem file cleanup scheduling mechanism

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PIPE-01 | User can enter a Match ID and system downloads the .dem replay file | OpenDota API `GET /matches/{match_id}` for replay_url, Steam GC via `dota2-user` for replay_salt fallback, Valve CDN URL format: `http://replay{cluster}.valve.net/570/{match_id}_{replay_salt}.dem.bz2` |
| PIPE-02 | System parses .dem file to extract hero positions, combat logs, and entity snapshots | odota/parser Docker sidecar on port 5600, `/blob?replay_url=...` endpoint returns newline-delimited JSON events, Clarity Java engine handles all .dem versions |
| PIPE-03 | Parsed data is stored in PostgreSQL for fast retrieval | Normalized schema with matches, players, combat_logs, position_snapshots tables; indexed by match_id and game_time for efficient querying |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x | Full-stack web framework (App Router) | Project decision; handles both landing page and API routes |
| BullMQ | 5.x | Async job queue for replay processing | Project decision; Redis-backed, TypeScript native, supports job progress events |
| ioredis | 5.x | Redis client (required by BullMQ) | BullMQ's official Redis dependency |
| Prisma | 6.x | PostgreSQL ORM and migrations | Type-safe database access, schema-as-code, auto-generated types |
| dota2-user | latest | Steam Game Coordinator client | TypeScript-native Dota 2 GC interface for replay_salt retrieval |
| steam-user | 4.2.0+ | Steam authentication layer | Required by dota2-user for Steam login |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node-cron | 3.x | Scheduled .dem file cleanup | Delete parsed .dem files after 24-48 hours |
| zod | 3.x | Input validation | Validate Match ID format on server side |
| tailwindcss | 4.x | Styling | Landing page and status page UI |

### External Services
| Service | Purpose | Notes |
|---------|---------|-------|
| odota/parser (Docker) | Parse .dem replay files | Sidecar container on port 5600, Clarity Java engine |
| Redis | BullMQ job queue backend | Redis 6.2+ required |
| PostgreSQL | Structured data storage | Primary data store for parsed replay data |
| OpenDota API | Replay URLs and match metadata | Free tier: 60 req/min, no API key needed |
| Valve CDN | .dem file download | URL constructed from cluster + match_id + replay_salt |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SSE for status | Polling | Polling is simpler but wastes bandwidth; SSE is the right fit for unidirectional server-to-client updates |
| SSE for status | WebSockets | WebSockets are overkill for one-way status updates; SSE is simpler, works through proxies, auto-reconnects |
| Prisma | Drizzle ORM | Drizzle is lighter but Prisma has better migration tooling for a greenfield project |
| node-cron | BullMQ repeatable jobs | BullMQ repeatable jobs could handle cleanup, but node-cron is simpler for a single scheduled task |

**Installation:**
```bash
npm install next@latest react react-dom bullmq ioredis @prisma/client zod
npm install -D prisma typescript @types/node @types/react tailwindcss
npm install steam-user dota2-user node-cron
npm install -D @types/node-cron
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/                       # Next.js App Router
│   ├── page.tsx               # Landing page (hero section + search + recent)
│   ├── match/
│   │   └── [matchId]/
│   │       └── page.tsx       # Status page (downloading -> parsing -> complete)
│   └── api/
│       ├── matches/
│       │   └── [matchId]/
│       │       └── route.ts   # POST: submit job, GET: fetch result
│       └── jobs/
│           └── [jobId]/
│               └── status/
│                   └── route.ts  # GET: SSE stream for job progress
├── lib/
│   ├── queue.ts               # BullMQ queue definition (shared between API and worker)
│   ├── redis.ts               # Redis connection singleton
│   ├── opendota.ts            # OpenDota API client
│   ├── steam-gc.ts            # Steam Game Coordinator client
│   └── db.ts                  # Prisma client singleton
├── workers/
│   └── replay-worker.ts       # BullMQ worker (runs as separate process)
├── scripts/
│   └── cleanup-dems.ts        # Scheduled .dem file cleanup
└── prisma/
    └── schema.prisma          # Database schema
```

### Pattern 1: Separate Worker Process
**What:** BullMQ worker runs as a standalone Node.js process, NOT inside Next.js server
**When to use:** Always for long-running jobs (replay download + parse can take 30-120 seconds)
**Why:** Next.js serverless functions have timeout limits; workers need persistent connections to Redis; mixing worker and web server in one process blocks the event loop during CPU-heavy operations

```typescript
// src/lib/queue.ts -- shared queue definition
import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export interface ReplayJobData {
  matchId: string;
  replayUrl: string;
}

export const replayQueue = new Queue<ReplayJobData>('replay-pipeline', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400 }, // 24 hours
    removeOnFail: { age: 604800 },     // 7 days
  },
});
```

```typescript
// src/workers/replay-worker.ts -- separate process
import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/redis';
import { ReplayJobData } from '../lib/queue';

const worker = new Worker<ReplayJobData>(
  'replay-pipeline',
  async (job: Job<ReplayJobData>) => {
    await job.updateProgress({ stage: 'downloading', percent: 0 });
    // 1. Download replay or send URL to parser
    // 2. Parse via odota/parser
    await job.updateProgress({ stage: 'parsing', percent: 50 });
    // 3. Store parsed data in PostgreSQL
    await job.updateProgress({ stage: 'complete', percent: 100 });
  },
  {
    connection: redisConnection,
    concurrency: 2, // limit concurrent parses
  }
);
```

### Pattern 2: SSE for Job Status Updates
**What:** Server-Sent Events stream from Next.js route handler for real-time status
**When to use:** Status page subscribing to job progress updates
**Why:** Unidirectional server->client, auto-reconnect, works through CDN/proxies, simpler than WebSockets

```typescript
// src/app/api/jobs/[jobId]/status/route.ts
import { NextRequest } from 'next/server';
import { QueueEvents } from 'bullmq';
import { redisConnection } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const queueEvents = new QueueEvents('replay-pipeline', {
        connection: redisConnection,
      });

      queueEvents.on('progress', ({ jobId, data }) => {
        if (jobId === params.jobId) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        }
      });

      queueEvents.on('completed', ({ jobId }) => {
        if (jobId === params.jobId) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ stage: 'complete' })}\n\n`)
          );
          controller.close();
        }
      });

      // Clean up on client disconnect
      req.signal.addEventListener('abort', () => {
        queueEvents.close();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### Pattern 3: odota/parser via /blob Endpoint
**What:** Use the `/blob?replay_url=...` endpoint instead of POSTing raw .dem data
**When to use:** When you have the replay download URL (which you will)
**Why:** Parser handles download, decompression (.bz2), and parsing in one step. No need to download the file to your server first.

```typescript
// In the worker:
const parserUrl = `http://localhost:5600/blob?replay_url=${encodeURIComponent(replayUrl)}`;
const response = await fetch(parserUrl);
// Response is newline-delimited JSON (ndjson)
const text = await response.text();
const events = text.trim().split('\n').map(line => JSON.parse(line));
```

### Pattern 4: Replay URL Acquisition (Two-Path Strategy)
**What:** Try OpenDota first, fall back to Steam GC
**Flow:**
1. `GET https://api.opendota.com/api/matches/{matchId}` -- check if `replay_url` exists
2. If `replay_url` present: use it directly
3. If missing: use Steam GC to get `cluster` + `replay_salt`, construct URL as `http://replay{cluster}.valve.net/570/{matchId}_{replaySalt}.dem.bz2`
4. If GC spike fails/disabled: return error "replay not available through OpenDota"

### Anti-Patterns to Avoid
- **Running BullMQ worker inside Next.js API routes:** Workers need persistent processes; serverless functions timeout and cold-start
- **Downloading .dem files to local disk before parsing:** Use the `/blob` endpoint to let the parser handle download directly from Valve CDN
- **Polling for job status from client:** Use SSE instead; polling wastes bandwidth and has latency
- **Storing raw .dem binary in PostgreSQL:** Store on filesystem (temp directory), auto-delete after 24-48 hours
- **Single monolithic "parse" function:** Break into stages (download -> parse -> store) with progress updates at each stage

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| .dem file parsing | Custom protobuf parser | odota/parser (Clarity) | .dem format uses Valve's proprietary protobuf schema; parser handles all game versions, entity state reconstruction, combat log deserialization |
| Job queue | Custom Redis polling loop | BullMQ | Retry logic, dead letter queues, concurrency control, progress events, job deduplication are all solved problems |
| Replay URL construction | Manual URL string building | Validate components then template | URL format is `http://replay{cluster}.valve.net/570/{matchId}_{replaySalt}.dem.bz2` -- simple but cluster/salt acquisition is the hard part |
| Database migrations | Raw SQL files | Prisma Migrate | Schema versioning, rollback, type generation |
| Steam GC communication | Raw protobuf + TCP | dota2-user + steam-user | Protocol is complex, rate-limited (100 req/24hr), needs session management |

**Key insight:** The .dem parsing problem is definitively solved by odota/parser. The real complexity in this phase is replay URL acquisition (getting the replay_salt) and the async pipeline orchestration.

## Common Pitfalls

### Pitfall 1: Replay Salt Unavailability
**What goes wrong:** OpenDota only has `replay_url` for matches it has already parsed. Most arbitrary match IDs will NOT have a replay_url in the OpenDota response.
**Why it happens:** Valve removed `replay_salt` from the Steam Web API years ago. Only the Dota 2 Game Coordinator provides it.
**How to avoid:** Implement the Steam GC fallback. The `dota2-user` library can request match details from the GC which includes the replay_salt. Rate limit: 100 GC requests per 24 hours per Steam account.
**Warning signs:** `replay_url` field is undefined/null in OpenDota API responses for unparsed matches.

### Pitfall 2: Valve Deletes Replays After ~14 Days
**What goes wrong:** Attempting to download a replay from Valve CDN returns 404 for matches older than ~14 days.
**Why it happens:** Valve's replay retention policy. The HTTP 404 is returned for both "replay not yet available" and "replay expired" -- same status code.
**How to avoid:** Check `start_time` from OpenDota match data. If `Date.now()/1000 - start_time > 864000` (10 days), warn user before attempting. Still attempt the download but handle 404 gracefully.
**Warning signs:** 404 responses from Valve CDN URLs.

### Pitfall 3: odota/parser Returns HTTP 204 for Corrupted Replays
**What goes wrong:** Parser returns 204 (no content) instead of parsed data when .dem file is corrupted or unsupported.
**Why it happens:** Parser catches exceptions internally and returns empty response.
**How to avoid:** Check response status code. 200 = success with ndjson body. 204 = parse failed. 500 = server error. Handle each case explicitly.
**Warning signs:** Empty response body, HTTP 204.

### Pitfall 4: BullMQ Worker Redis Connection Must Set maxRetriesPerRequest: null
**What goes wrong:** Worker crashes with "ReplyError: NOSCRIPT" or connection timeouts.
**Why it happens:** BullMQ requires blocking Redis commands that conflict with ioredis default retry settings.
**How to avoid:** Always configure Redis connection with `maxRetriesPerRequest: null` for BullMQ workers.
```typescript
import Redis from 'ioredis';
const connection = new Redis({ maxRetriesPerRequest: null });
```

### Pitfall 5: Next.js SSE Route Handlers Buffer Before Sending
**What goes wrong:** SSE events arrive all at once instead of streaming.
**Why it happens:** Next.js waits for the route handler function to complete before sending the Response if you use `await` inside the stream setup.
**How to avoid:** Return the Response immediately. Start async streaming work in the ReadableStream's `start` callback. Set `export const dynamic = 'force-dynamic'` to prevent caching.

### Pitfall 6: Steam GC Bot Account Requirements
**What goes wrong:** Bot can't connect or gets rate-limited.
**Why it happens:** Steam Guard, existing sessions, or rate limits.
**How to avoid:** Use a dedicated alt Steam account. Disable Steam Guard on it. Don't log in from the regular Steam client while the bot is running. Respect the 100 req/24hr GC rate limit.

## Code Examples

### OpenDota API Client
```typescript
// src/lib/opendota.ts
const OPENDOTA_BASE = 'https://api.opendota.com/api';

export interface OpenDotaMatch {
  match_id: number;
  duration: number;
  start_time: number;
  cluster: number;
  replay_url?: string;  // Only present for parsed matches
  game_mode: number;
  radiant_win: boolean;
  players: OpenDotaPlayer[];
}

export async function getMatch(matchId: string): Promise<OpenDotaMatch> {
  const res = await fetch(`${OPENDOTA_BASE}/matches/${matchId}`);
  if (!res.ok) throw new Error(`OpenDota API error: ${res.status}`);
  return res.json();
}

export function isReplayLikelyExpired(startTime: number): boolean {
  const TEN_DAYS_SECONDS = 10 * 24 * 60 * 60;
  return (Date.now() / 1000 - startTime) > TEN_DAYS_SECONDS;
}

export function constructReplayUrl(
  matchId: string,
  cluster: number,
  replaySalt: number
): string {
  return `http://replay${cluster}.valve.net/570/${matchId}_${replaySalt}.dem.bz2`;
}
```

### Parser Client
```typescript
// src/lib/parser.ts
const PARSER_BASE = 'http://localhost:5600';

export interface ParsedEvent {
  type: string;
  time?: number;
  // Fields vary by event type -- combat_log, hero_position, entity_state, etc.
  [key: string]: unknown;
}

export async function parseReplay(replayUrl: string): Promise<ParsedEvent[]> {
  const url = `${PARSER_BASE}/blob?replay_url=${encodeURIComponent(replayUrl)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(300000) }); // 5 min timeout

  if (res.status === 204) {
    throw new Error('Replay parse failed: corrupted or unsupported file');
  }
  if (!res.ok) {
    throw new Error(`Parser error: ${res.status}`);
  }

  const text = await res.text();
  return text
    .trim()
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => JSON.parse(line));
}
```

### Match ID Validation (Client-Side)
```typescript
// src/lib/validation.ts
import { z } from 'zod';

export const matchIdSchema = z
  .string()
  .regex(/^\d{8,12}$/, 'Match ID must be 8-12 digits');

export function validateMatchId(input: string): { valid: boolean; error?: string } {
  const result = matchIdSchema.safeParse(input.trim());
  if (!result.success) {
    return { valid: false, error: result.error.issues[0].message };
  }
  return { valid: true };
}
```

## Database Schema Design (Claude's Discretion)

**Recommendation:** Normalized schema with separate tables for matches, players, combat logs, and position snapshots.

```prisma
// prisma/schema.prisma
model Match {
  id          String    @id @default(cuid())
  matchId     BigInt    @unique @map("match_id")
  duration    Int
  startTime   DateTime  @map("start_time")
  gameMode    Int       @map("game_mode")
  radiantWin  Boolean   @map("radiant_win")
  cluster     Int
  replayUrl   String?   @map("replay_url")
  demFilePath String?   @map("dem_file_path")
  parsedAt    DateTime? @map("parsed_at")
  status      String    @default("pending") // pending, downloading, parsing, complete, failed
  errorMsg    String?   @map("error_msg")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  players         Player[]
  combatLogEvents CombatLogEvent[]
  positionSnapshots PositionSnapshot[]

  @@map("matches")
}

model Player {
  id          String @id @default(cuid())
  matchId     BigInt @map("match_id")
  playerSlot  Int    @map("player_slot")
  heroId      Int    @map("hero_id")
  accountId   BigInt? @map("account_id")
  kills       Int    @default(0)
  deaths      Int    @default(0)
  assists     Int    @default(0)
  goldPerMin  Int    @map("gold_per_min")
  xpPerMin    Int    @map("xp_per_min")
  lastHits    Int    @map("last_hits")
  denies      Int
  heroDamage  Int    @map("hero_damage")
  towerDamage Int    @map("tower_damage")
  heroHealing Int    @map("hero_healing")
  items       Json   // array of item IDs at end of game

  match Match @relation(fields: [matchId], references: [matchId])

  @@unique([matchId, playerSlot])
  @@index([matchId])
  @@map("players")
}

model CombatLogEvent {
  id            String @id @default(cuid())
  matchId       BigInt @map("match_id")
  gameTime      Int    @map("game_time") // seconds into the game
  eventType     String @map("event_type") // damage, heal, buff, item_use, ability_cast, kill
  attackerHero  String? @map("attacker_hero")
  targetHero    String? @map("target_hero")
  inflictor     String? // ability or item name
  value         Int?    // damage amount, heal amount, etc.
  isAttackerHero Boolean @default(false) @map("is_attacker_hero")
  isTargetHero   Boolean @default(false) @map("is_target_hero")

  match Match @relation(fields: [matchId], references: [matchId])

  @@index([matchId, gameTime])
  @@index([matchId, eventType])
  @@map("combat_log_events")
}

model PositionSnapshot {
  id        String @id @default(cuid())
  matchId   BigInt @map("match_id")
  gameTime  Int    @map("game_time") // every 10 seconds
  heroId    Int    @map("hero_id")
  x         Float
  y         Float
  gold      Int
  xp        Int

  match Match @relation(fields: [matchId], references: [matchId])

  @@index([matchId, gameTime])
  @@index([matchId, heroId])
  @@map("position_snapshots")
}
```

**Schema rationale:**
- `CombatLogEvent` is the largest table (thousands of rows per match). Indexed by `(matchId, gameTime)` for time-range queries and `(matchId, eventType)` for filtering.
- `PositionSnapshot` stores hero position + gold + XP every 10 seconds. At ~50 minutes match duration, that's ~300 snapshots per hero x 10 heroes = ~3000 rows per match.
- `Player` stores end-of-game stats. One row per player per match (10 per match).
- `matchId` is BigInt because Dota 2 match IDs are large numbers (currently ~8.5 billion).

## Status Page Update Mechanism (Claude's Discretion)

**Recommendation: Server-Sent Events (SSE)**

SSE is the best fit because:
1. Updates flow in one direction only (server -> client)
2. Built-in browser reconnection with `EventSource` API
3. Works through CDNs and proxies (unlike WebSockets)
4. Simpler than WebSockets -- no handshake upgrade, no bidirectional protocol
5. Next.js 15 App Router supports SSE via route handlers with `ReadableStream`

Implementation: BullMQ `QueueEvents` emits `progress` events. The SSE route handler listens for these and streams them to the client. Client uses `EventSource` to subscribe.

## .dem File Cleanup (Claude's Discretion)

**Recommendation: BullMQ repeatable job (not node-cron)**

Since BullMQ is already in the stack, use a repeatable job to clean up .dem files older than 24 hours. This avoids adding another dependency and keeps cleanup within the job system:

```typescript
// In worker startup
await replayQueue.add('cleanup-dem-files', {}, {
  repeat: { pattern: '0 */6 * * *' }, // every 6 hours
  jobId: 'cleanup-dem-files', // prevent duplicates
});
```

Note: Since the `/blob` endpoint on the parser downloads and parses directly from the URL, .dem files are only stored locally if you need to support re-parsing. If using `/blob` exclusively, there may be no local .dem files to clean up. However, the CONTEXT.md specifies keeping originals for 24-48 hours, so store them after download for potential re-parse.

## Parse Failure UX (Claude's Discretion)

**Recommendation:** Show a clear error state on the status page with specific messages:
- "Replay expired" -- match is older than ~14 days, Valve has deleted the replay
- "Replay not available" -- OpenDota doesn't have the URL and Steam GC couldn't fetch it
- "Parse failed" -- .dem file downloaded but parser returned 204 (corrupted)
- "Download failed" -- Valve CDN returned an error

Each error state should show a brief explanation and suggest the user try a different match. Include the match ID and timestamp for debugging.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `replay_salt` from Steam Web API | Must use Game Coordinator | ~2019 (Valve removed it) | Cannot download replays without GC access or OpenDota |
| Bull (v3) job queue | BullMQ (v5) | 2022+ | BullMQ is the maintained successor, TypeScript-native |
| Next.js Pages Router API routes | App Router route handlers | Next.js 13+ (2023) | Route handlers support streaming/SSE natively |
| odota/parser POST with raw binary | odota/parser `/blob?replay_url=` | Available in current version | Parser handles download+decompress+parse in one call |

**Deprecated/outdated:**
- `bull` npm package: Use `bullmq` instead (same team, TypeScript rewrite)
- `node-dota2` (Arcana): Less maintained; `dota2-user` (itsjfx) is TypeScript-native and simpler
- Steam Web API `GetMatchDetails` for replay_salt: Valve removed this field years ago

## Open Questions

1. **What exact ndjson event types does odota/parser emit?**
   - What we know: Parser outputs newline-delimited JSON. Events include combat log entries, entity state changes, and metadata.
   - What's unclear: Exact field names and event type taxonomy. Need to run a test parse to catalog the output schema.
   - Recommendation: During the GC spike task, also run a test .dem through the parser and document the output schema. This is prerequisite to designing the data ingestion logic.

2. **OpenDota API rate limits for free tier**
   - What we know: No API key needed. Community reports suggest ~60 requests/minute.
   - What's unclear: Exact rate limit headers, whether it's per-IP or global.
   - Recommendation: Implement conservative rate limiting (1 req/sec) and respect `X-Rate-Limit-*` headers if present.

3. **Steam GC reliability and rate limits**
   - What we know: 100 GC requests per 24 hours per Steam account. `dota2-user` is in alpha.
   - What's unclear: Connection stability, session management, error recovery patterns.
   - Recommendation: This is exactly what the spike is for. Test with 5-10 match IDs and document behavior.

4. **Parser memory usage for large replays**
   - What we know: Parser is Java-based, handles .dem files that can be 100-200MB uncompressed.
   - What's unclear: Memory requirements for the Docker container.
   - Recommendation: Set Docker memory limits (1-2GB) and test with long matches (60+ minutes).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (latest, aligned with Next.js ecosystem) |
| Config file | none -- see Wave 0 |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PIPE-01 | Submit match ID, system downloads replay | integration | `npx vitest run tests/integration/replay-download.test.ts -x` | No - Wave 0 |
| PIPE-01 | OpenDota API client returns match data | unit | `npx vitest run tests/unit/opendota.test.ts -x` | No - Wave 0 |
| PIPE-01 | Replay URL construction from cluster + salt | unit | `npx vitest run tests/unit/replay-url.test.ts -x` | No - Wave 0 |
| PIPE-01 | Match ID validation (client + server) | unit | `npx vitest run tests/unit/validation.test.ts -x` | No - Wave 0 |
| PIPE-01 | Expired replay warning (>10 days) | unit | `npx vitest run tests/unit/replay-expiry.test.ts -x` | No - Wave 0 |
| PIPE-02 | Parser client handles 200/204/500 responses | unit | `npx vitest run tests/unit/parser.test.ts -x` | No - Wave 0 |
| PIPE-02 | Parsed ndjson events are correctly structured | unit | `npx vitest run tests/unit/parse-events.test.ts -x` | No - Wave 0 |
| PIPE-03 | Parsed data is stored in PostgreSQL correctly | integration | `npx vitest run tests/integration/data-storage.test.ts -x` | No - Wave 0 |
| PIPE-03 | Match data is queryable by match_id | integration | `npx vitest run tests/integration/data-query.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration with path aliases matching Next.js
- [ ] `tests/unit/` directory -- unit test files for validation, API clients, URL construction
- [ ] `tests/integration/` directory -- integration tests requiring database/Redis
- [ ] `tests/fixtures/` -- sample OpenDota API responses, sample ndjson parser output
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react` -- if none detected

## Sources

### Primary (HIGH confidence)
- OpenDota API live response (`api.opendota.com/api/matches/8583844960`) -- verified field structure, confirmed `replay_url` is absent for unparsed matches
- [odota/parser GitHub](https://github.com/odota/parser) -- port 5600, `/blob` endpoint, ndjson output, Java/Clarity engine
- [odota/parser Main.java](https://github.com/odota/parser/blob/master/src/main/java/opendota/Main.java) -- HTTP endpoints (`/`, `/blob`, `/healthz`), response codes (200/204/500)
- [BullMQ Quick Start](https://docs.bullmq.io/readme-1) -- Queue/Worker API, Redis requirements
- [BullMQ Events](https://docs.bullmq.io/guide/events) -- job.updateProgress(), QueueEvents for progress monitoring

### Secondary (MEDIUM confidence)
- [dota2-user GitHub](https://github.com/itsjfx/node-dota2-user) -- TypeScript GC client, alpha status, requires steam-user 4.2.0+
- [odota/core Issue #1608](https://github.com/odota/core/issues/1608) -- Valve deletes replays after ~2 weeks, 404 for both missing and expired
- [odota/parser Issue #13](https://github.com/odota/parser/issues/13) -- replay_salt must come from GC, not Web API
- Next.js SSE pattern from [multiple Medium/HackerNoon articles](https://hackernoon.com/streaming-in-nextjs-15-websockets-vs-server-sent-events) -- ReadableStream + force-dynamic

### Tertiary (LOW confidence)
- OpenDota rate limit (60 req/min) -- community reports, not officially documented
- Steam GC rate limit (100 req/24hr) -- mentioned in dota2-user docs, needs validation during spike
- `dota2-user` stability -- library is in alpha, author maintains for personal use

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are well-established, project decisions are locked
- Architecture: MEDIUM-HIGH - Separate worker pattern and SSE are standard BullMQ+Next.js patterns, verified with multiple sources
- Replay acquisition: MEDIUM - OpenDota API verified with live call; Steam GC path needs spike validation
- Database schema: MEDIUM - Schema design is Claude's discretion, based on known data types from parser output
- Pitfalls: HIGH - Verified through GitHub issues, API testing, and official docs

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (30 days -- stack is stable, Valve replay infrastructure changes are rare)
