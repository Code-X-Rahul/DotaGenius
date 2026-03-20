# Architecture Patterns

**Domain:** Dota 2 Replay Analysis Tool
**Researched:** 2026-03-20

## Recommended Architecture

DotaGenius should follow a **pipeline architecture** with clear stage boundaries. This is the proven pattern used by OpenDota (the largest open-source Dota 2 analysis platform) adapted for a single-project scope rather than a platform ingesting millions of matches.

The system has five major stages: **Acquire -> Parse -> Store -> Analyze -> Present**. Each stage is a distinct module with well-defined inputs and outputs, communicable via function calls within a monolithic Node.js backend (no need for microservices at DotaGenius's scale).

```
User enters Match ID
       |
       v
[1. Replay Acquisition] -- Steam Web API + OpenDota API
       |
       v  (.dem.bz2 file)
[2. Replay Parser]      -- Java Clarity subprocess or odota/parser HTTP service
       |
       v  (structured JSON events)
[3. Data Store]          -- PostgreSQL + file system cache
       |
       v  (queryable match data)
[4. AI Analysis Engine]  -- Rules engine + LLM API
       |
       v  (insights JSON)
[5. Frontend]            -- Next.js with SVG heatmaps + timeline
```

### Component Boundaries

| Component | Responsibility | Inputs | Outputs | Communicates With |
|-----------|---------------|--------|---------|-------------------|
| **Replay Acquisition** | Resolve match ID to replay URL, download .dem.bz2 file | Match ID (number) | .dem file on disk/stream | Steam Web API, OpenDota API, Data Store |
| **Replay Parser** | Extract structured events from binary protobuf replay | .dem file path or stream | JSON event stream (positions, combat log, items, gold/xp) | Replay Acquisition (input), Data Store (output) |
| **Data Store** | Persist match metadata + parsed events in queryable format | JSON events, match metadata | SQL-queryable match data | All other components |
| **AI Analysis Engine** | Apply rule-based detection + LLM explanation generation | Parsed match data from DB | Structured insights (rotation analysis, itemization audit) | Data Store (input), LLM API (external) |
| **Meta Data Service** | Periodically scrape/cache current meta builds and win rates | Dotabuff/OpenDota pages | Cached meta builds per hero/role | AI Analysis Engine, Frontend |
| **Frontend/API** | Serve UI, expose REST endpoints, render visualizations | User requests | HTML/JSON responses, SVG heatmaps, timeline data | Data Store, AI Analysis Engine |

### Data Flow

**Phase 1: Match Submission**
1. User submits Match ID via frontend form
2. Backend checks if match already exists in database (cache hit)
3. If not cached: initiate replay acquisition pipeline

**Phase 2: Replay Acquisition**
1. Call Steam Web API `GetMatchDetails` to get match metadata (players, heroes, duration, outcome)
2. Get replay URL via one of two methods:
   - **Preferred (simpler):** Use OpenDota API `GET /api/matches/{match_id}` which includes `replay_url` if available, or `POST /api/request/{match_id}` to trigger a parse on their infrastructure
   - **Self-hosted (complex):** Use Steam Game Coordinator via `node-dota2` library (requires a Steam account login) to get replay salt, then construct download URL `http://replay{cluster}.valve.net/570/{match_id}_{salt}.dem.bz2`
3. Download and decompress the .dem.bz2 file

**Phase 3: Parsing**
1. Send .dem file to parser (Java Clarity subprocess or HTTP POST to odota/parser on port 5600)
2. Parser emits line-delimited JSON events covering:
   - Hero positions (x, y coordinates per tick/interval)
   - Combat log (kills, damage, healing, item usage)
   - Gold/XP progression per player
   - Item purchase timestamps
   - Ward placements
   - Ability usage and cooldowns
3. Store parsed JSON events in PostgreSQL

**Phase 4: Analysis**
1. Rules engine queries parsed data for patterns:
   - Rotation timing: compare support positions against gank opportunities (enemy hero positions + missing heroes)
   - Itemization: compare item purchase timestamps and final build against meta builds for that hero/matchup
   - Death clustering: aggregate death positions for heatmap data
   - Net worth spikes/dips: identify key economic moments
2. LLM receives structured pattern data + game context, generates natural-language explanations
3. Store analysis results in database linked to match

**Phase 5: Presentation**
1. Frontend fetches analysis results via REST API
2. Render:
   - Heatmap: SVG overlay on minimap image using death/position coordinate data
   - Timeline: scrubable slider mapped to game time with net worth graph + event markers
   - Analysis cards: rule-detected patterns with LLM-generated explanations

## Architecture Decision: Monolith vs Microservices

**Use a monolith.** OpenDota uses microservices because they parse millions of matches across distributed nodes. DotaGenius parses one match at a time on user request. A single Node.js backend with the parser as an external subprocess is the right call.

The one exception: the **Clarity Java parser runs as a separate process** (either subprocess or sidecar HTTP service). This is unavoidable -- Clarity is Java, the rest of the stack is TypeScript/Node.js. The odota/parser project already wraps Clarity in an HTTP server on port 5600, which is the cleanest integration point.

## Patterns to Follow

### Pattern 1: Pipeline with Job Status Tracking
**What:** Each match analysis is a "job" that progresses through stages (submitted -> downloading -> parsing -> analyzing -> complete/failed). The frontend polls for status.
**When:** Always -- replay download + parse can take 30-60 seconds.
**Example:**
```typescript
// Job status model
interface AnalysisJob {
  matchId: number;
  status: 'submitted' | 'downloading' | 'parsing' | 'analyzing' | 'complete' | 'failed';
  progress: number; // 0-100
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// API: POST /api/analyze/:matchId -> returns jobId
// API: GET /api/jobs/:jobId -> returns current status
// API: GET /api/matches/:matchId/analysis -> returns results when complete
```

### Pattern 2: Replay URL Resolution Strategy (Fallback Chain)
**What:** Try multiple sources for replay URL since no single source is 100% reliable.
**When:** Every match analysis request.
**Example:**
```typescript
async function getReplayUrl(matchId: number): Promise<string> {
  // 1. Check if we already have the replay cached locally
  if (await replayExistsOnDisk(matchId)) return localPath(matchId);

  // 2. Try OpenDota API (simplest, no auth needed)
  const odotaMatch = await fetch(`https://api.opendota.com/api/matches/${matchId}`);
  if (odotaMatch.replay_url) return odotaMatch.replay_url;

  // 3. Request OpenDota to parse it (may take time)
  await fetch(`https://api.opendota.com/api/request/${matchId}`, { method: 'POST' });
  // Poll until replay_url available...

  // 4. Fallback: Steam Web API + GC (requires Steam account)
  return await getReplayUrlFromGC(matchId);
}
```

### Pattern 3: Separation of Detection (Rules) and Explanation (LLM)
**What:** Rules engine produces structured findings, LLM converts them to readable insights. Never let the LLM decide what patterns exist -- it only explains pre-detected patterns.
**When:** All AI analysis.
**Why:** Rules are deterministic, testable, and fast. LLMs hallucinate game knowledge. Combining them gives reliability + readability.
**Example:**
```typescript
// Rules engine output (deterministic)
interface RotationFinding {
  type: 'missed_rotation';
  timestamp: number;
  playerHero: string;
  playerPosition: { x: number; y: number };
  opportunityLocation: { x: number; y: number };
  enemyHeroesVisible: string[];
  goldDifferenceAtTime: number;
}

// LLM input: structured finding + game context
// LLM output: "At 8:32, your Crystal Maiden was still farming the
// small camp near the safe lane when Pudge was alone mid with no
// vision. A smoke rotation here could have netted a kill worth ~300g
// and relieved pressure on your mid laner who was 400g behind."
```

### Pattern 4: Coordinate System Normalization
**What:** Normalize .dem file coordinates to minimap pixel coordinates immediately after parsing. Store normalized coordinates.
**When:** During the parse-to-store step.
**Why:** Dota 2 uses world coordinates (large numbers, different scale). The minimap SVG needs 0-1 or pixel coordinates. Normalizing once avoids repeated conversion in every visualization.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Parsing on Every Request
**What:** Re-downloading and re-parsing the replay every time someone views a match.
**Why bad:** Parsing is CPU-intensive (takes 5-30 seconds even with Clarity). Replays expire after ~2 weeks from Valve servers.
**Instead:** Parse once, store structured results in PostgreSQL. Serve all subsequent views from the database.

### Anti-Pattern 2: Storing Raw .dem Files Long-Term
**What:** Keeping downloaded replay files on disk indefinitely.
**Why bad:** .dem files are ~30MB compressed, ~100-200MB uncompressed. Storage costs grow fast. Once parsed, the raw replay has no additional value for this use case.
**Instead:** Parse immediately, store structured JSON results, delete the .dem file after successful parsing. Keep a 24-hour cache for re-parse requests.

### Anti-Pattern 3: Letting the LLM Analyze Raw Game Data
**What:** Sending raw combat logs or position data to the LLM and asking it to find patterns.
**Why bad:** LLMs are expensive per token, slow, and hallucinate game-specific logic. A 45-minute match generates thousands of events that would blow context limits.
**Instead:** Rules engine reduces data to 5-15 specific findings. LLM only receives these structured findings for natural-language explanation.

### Anti-Pattern 4: Building Your Own Replay Parser
**What:** Writing a custom .dem file parser from scratch.
**Why bad:** The protobuf format is complex, undocumented by Valve, and changes with game updates. Parser maintenance is a full-time job.
**Instead:** Use Clarity (Java) via the odota/parser HTTP wrapper. It is actively maintained and handles format changes.

### Anti-Pattern 5: Real-Time WebSocket for Initial Parse
**What:** Using WebSockets to stream parsing progress to the client.
**Why bad:** Over-engineering for v1. Adds complexity. Parse takes 30-60 seconds -- simple polling every 2-3 seconds is fine.
**Instead:** POST to start, GET to poll status. Add WebSockets in v2 if user demand exists.

## Scalability Considerations

| Concern | 1-10 users (MVP) | 100-1K users | 10K+ users |
|---------|-------------------|--------------|------------|
| **Parse throughput** | Single parser process, sequential | Queue with 2-3 parser workers | Dedicated parse worker pool, potentially cloud functions |
| **Replay storage** | Local filesystem, delete after parse | Same, extend cache window | S3/MinIO for temporary storage |
| **Database** | Single PostgreSQL instance | Same, add indexes for common queries | Read replicas, partition by match_id |
| **LLM API calls** | Direct calls, no batching | Cache LLM responses per match | Cache + rate limiting per user |
| **Meta data** | Manual or cron scrape | Cron scrape every patch | Dedicated meta data worker |

## Suggested Build Order

Based on component dependencies, the recommended build order is:

1. **Data Store schema + API scaffolding** -- Everything depends on this. Define the match, player_match, parsed_events, and analysis tables early.
2. **Replay Acquisition** -- Get match metadata from Steam API + replay URL from OpenDota. This proves the pipeline works end-to-end even before parsing.
3. **Parser Integration** -- Set up odota/parser as a Docker container, POST replays to it, consume JSON output, store in database.
4. **Rules Engine** -- Build detection logic for rotation timing and itemization analysis against stored parsed data. This is testable without the LLM.
5. **Meta Data Service** -- Scrape/cache Dotabuff data for hero builds so the itemization rules have a baseline to compare against.
6. **LLM Integration** -- Add natural-language explanation generation on top of rules engine findings.
7. **Frontend Visualization** -- Heatmaps, timeline slider, analysis display. Depends on all backend components being functional.

**Rationale:** Each step produces testable output that feeds the next. The parser is the highest-risk component (external Java dependency, binary format complexity) and should be validated early. The LLM and frontend are lower-risk and can be built once data flows correctly.

## Key External Dependencies

| Dependency | Risk Level | Mitigation |
|------------|-----------|------------|
| **Steam Web API** | Medium -- rate limited (100K calls/day, ~1/sec) | Cache responses, use OpenDota API as primary |
| **OpenDota API** | Low -- free tier, well-maintained | Rate limit: 60 req/min without API key. Get free API key for higher limits |
| **Valve Replay Servers** | High -- replays expire after ~2 weeks | Warn users about expiry window, process quickly |
| **odota/parser (Clarity)** | Medium -- Java dependency, may lag game updates | Pin known-working version, Docker containerize |
| **LLM API (OpenAI/Anthropic)** | Low -- reliable, but costs per call | Cache analysis results, never re-analyze same match |
| **Dotabuff** | Medium -- scraping may break on site changes | Cache aggressively, update scraper per Dota patch cycle |

## Sources

- [OpenDota Architecture Blog Post](https://blog.opendota.com/2016/05/15/architecture/) - Detailed microservice architecture of the largest open-source Dota 2 data platform
- [OpenDota Lessons Learned from 10M Replays](https://blog.opendota.com/2016/05/13/learnings/) - Scaling challenges, database decisions, performance lessons
- [DeepWiki: OpenDota Core Architecture](https://deepwiki.com/odota/core) - Comprehensive architecture analysis including queue systems and data flow
- [odota/parser GitHub](https://github.com/odota/parser) - Java replay parse server (Clarity-based), port 5600, JSON event output
- [odota/rapier GitHub](https://github.com/odota/rapier) - JavaScript Dota 2 replay parser (alternative to Clarity)
- [dotabuff/manta GitHub](https://github.com/dotabuff/manta) - Go-based replay parser by Dotabuff
- [Anatomy of a Dota 2 Replay File](https://github.com/skadistats/smoke/wiki/Anatomy-of-a-Dota-2-Replay-File) - Technical breakdown of .dem protobuf format
- [OpenDota API Documentation](https://docs.opendota.com/) - REST API for match data and replay URLs
- [Valve Developer Wiki: Demoinfo2](https://developer.valvesoftware.com/wiki/Demoinfo2) - Official Source 2 demo format reference
- [BrightGir/dota-ai-coach](https://github.com/BrightGir/dota-ai-coach) - Example of LLM-based Dota 2 coaching tool architecture
- [VisualizAncients](https://github.com/jacquesh/VisualizAncients) - Dota 2 positional data visualization with heatmaps
- [Dotalys 2](https://www.lighti.de/projects/dotalys-2/) - Replay analysis tool with trajectory heatmaps
- [STRATZ](https://stratz.com/) - Commercial Dota 2 analytics platform with playback visualization
