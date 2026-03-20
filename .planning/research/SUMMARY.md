# Project Research Summary

**Project:** DotaGenius — Dota 2 Replay Analysis Tool
**Domain:** Game replay analysis / AI coaching
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

DotaGenius is a post-match coaching tool that differentiates itself from existing platforms (Dotabuff, OpenDota, STRATZ) by drawing actionable conclusions from replay data rather than just displaying statistics. The critical technical insight from research is that this is a pipeline product: every feature is downstream of a working replay download-and-parse pipeline. The recommended architecture is a monolithic Next.js 16 backend with the Clarity Java parser running as a Docker sidecar, background jobs via BullMQ/Redis, and a hybrid AI layer where a deterministic rules engine detects patterns and Claude Sonnet generates natural-language explanations. This hybrid approach is non-negotiable — LLMs alone cannot reliably analyze game data due to hallucination risks and context size limitations.

The three competitive differentiators that no existing tool offers are: AI rotation analysis (telling players where their support should have been and why), AI itemization audit (comparing actual builds against the optimal build for the specific matchup), and natural-language match summaries that narrate the story of why a game was won or lost. These are only possible because DotaGenius parses the actual .dem replay file to access position data and combat logs — something API-only tools like WebAtlas cannot replicate. The product should not attempt to compete on data breadth with established platforms that have years of history; it competes on insight quality.

The highest-risk area is the replay acquisition layer. Valve removed `replay_salt` from the public Steam Web API, replays expire after approximately 10 days, and the protobuf schema changes with every major patch. These are not edge cases — they are operational realities that must be designed around from day one. Using the OpenDota API as the primary replay URL source (with Steam Game Coordinator as fallback) and Clarity as the parser (the most actively maintained parser, used by OpenDota and Dotabuff) are the correct mitigations.

## Key Findings

### Recommended Stack

The stack is built around Next.js 16 (App Router, Turbopack, React Server Components) with TypeScript 5.7+, Drizzle ORM on PostgreSQL 16, and Redis 7 backing BullMQ job queues. Drizzle is preferred over Prisma specifically because Prisma's query engine binary adds cold start latency in the serverless context. The odota/parser Docker container wrapping Clarity is the only viable Node.js-compatible path for .dem parsing — there is no production-ready JavaScript parser. The AI layer uses the Vercel AI SDK with the Anthropic provider (`claude-sonnet-4-6`) and structured output generation via Zod schemas.

**Core technologies:**
- Next.js 16 + React 19: Full-stack framework — SSR ideal for data-heavy analysis pages, App Router for server components
- TypeScript 5.7+: Type safety — non-negotiable given complex game data schemas and Drizzle/tRPC TS inference
- PostgreSQL 16 + Drizzle 0.45: Primary data store — relational structure with JSONB for evolving game event data
- Redis 7 + BullMQ 5: Job queue — replay parsing (10-60 sec) must be async, never on the web server
- odota/parser (Docker/Clarity): Replay parsing — the only battle-tested, HTTP-accessible .dem parser; runs as sidecar container
- Claude Sonnet 4.6 (Anthropic SDK): AI explanations — structured outputs (GA, no beta header) for guaranteed JSON compliance
- Custom TypeScript rules engine: Pattern detection — deterministic, testable; LLM only explains what rules detect
- Recharts + shadcn/ui: Visualization — first-class integration, covers net worth/XP timelines
- Custom Canvas heatmap: Death density map — SVG breaks above ~1,000 points; Canvas handles 5,000+ at 60fps

### Expected Features

**Must have (table stakes) — v1 launch:**
- Replay pipeline (download via Match ID, parse with Clarity) — the entire product depends on this
- Basic match summary (KDA, items, hero, duration) — immediate signal that the system works
- Laning phase breakdown (lane assignments, CS at 10 min) — every player cares about laning
- Gold/XP graphs over time — visual story of match momentum
- Death density heatmap — visually impressive, demonstrates unique value from replay data
- AI rotation analysis — the core differentiator; even a basic version validates the concept
- Natural language match summary — LLM-generated narrative tying all findings together

**Should have (competitive) — v1.x after validation:**
- AI itemization audit — requires meta data pipeline (OpenDota API hero builds); add after rotation analysis is validated
- Ward placement map — straightforward from combat log, adds support-player value
- Interactive timeline slider with event annotations — enriches presentation layer significantly
- Teamfight breakdown with contribution scores — deeper combat log analysis
- Death log / kill feed — lower priority than AI insights

**Defer (v2+):**
- Steam account linking / auto-match-pull — convenience, not core value; OAuth adds scope creep
- Cross-match personalized improvement focus — requires user accounts and match history storage
- 2D minimap playback (hero dots on map) — high complexity for rendering layer
- Real-time in-game overlay — completely different architecture; Valve ToS gray area; separate product entirely

### Architecture Approach

DotaGenius follows a five-stage pipeline architecture: Acquire → Parse → Store → Analyze → Present. This is modeled on OpenDota's proven architecture but scoped to a monolith — no microservices are warranted at this scale. The one structural exception is the Clarity parser, which unavoidably runs as a separate Java process (HTTP sidecar on port 5600). Every match analysis is a background job tracked through discrete status stages (submitted → downloading → parsing → analyzing → complete/failed), with the frontend polling for completion via React Query.

**Major components:**
1. Replay Acquisition — Resolves Match ID to .dem.bz2 file; uses OpenDota API as primary URL source, Steam GC via `node-steam-user` as fallback
2. Replay Parser — odota/parser Docker container; accepts POST of .dem file, returns line-delimited JSON with positions, combat log, gold/XP, item purchases
3. Data Store — PostgreSQL with JSONB columns for parsed events; Drizzle ORM; parse once, serve forever
4. AI Analysis Engine — TypeScript rules engine (deterministic pattern detection) feeding structured findings to Claude (natural-language explanation only)
5. Meta Data Service — OpenDota API (`/heroStats`, `/heroes/{id}/itemPopularity`) for hero build baselines; cache daily; never scrape Dotabuff
6. Frontend / API — Next.js App Router; Canvas heatmap, Recharts timeline, analysis cards; polls job status via React Query

### Critical Pitfalls

1. **Replay salt not available via Steam Web API** — Valve removed `replay_salt` from `GetMatchDetails`. Use OpenDota API `/api/matches/{match_id}` as primary source for replay URLs; fall back to Steam GC (`node-steam-user`) for matches not yet in OpenDota. Validate this in a spike before building anything else.

2. **Replay expiry is ~10 days, not 14** — Design expiry validation into the pipeline from day one. Show the expiry window prominently in the UI. Cache parsed results in PostgreSQL so users can revisit analysis even after the replay expires from Valve's CDN.

3. **Protobuf schema breaks after every major Dota patch** — Use Clarity (Java, fastest update cycle) via odota/parser. Pin parser version in Docker. Build a post-patch validation workflow and graceful degradation (show API metadata if parse fails).

4. **Parsing blocks the web server if not async** — BullMQ job queue is mandatory from the start. Retrofitting async parsing is expensive. The web server must return a job ID immediately and never wait for parse completion.

5. **LLM hallucinations on game data** — Never send raw replay data to the LLM. Rules engine reduces data to 5-15 structured findings; LLM only explains those findings. Validate LLM output against parsed data before display. Include current patch context in prompts.

6. **Dotabuff scraping will get you blocked** — Use OpenDota API (`/heroStats`, `/heroes/{id}/itemPopularity`) for all meta data. It is a legitimate API with 50,000 free calls/month. Dotabuff has aggressive bot detection and no public API.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Replay Pipeline Foundation
**Rationale:** Every feature in the product depends on working replay download and parsing. This is the highest-risk component (Valve API unreliability, 10-day expiry, Java parser dependency). It must be validated end-to-end before any analysis features are built. Architecture decisions made here (async job queue, parse-once-store-forever, coordinate normalization) cannot be easily refactored later.
**Delivers:** Working pipeline that accepts a Match ID, downloads the .dem file, parses it with Clarity, stores structured events in PostgreSQL, and returns job status to the frontend. Basic match summary UI.
**Addresses features:** Replay pipeline (P1), basic match summary (P1)
**Avoids pitfalls:** Replay URL via OpenDota API (not broken Steam Web API), async parsing via BullMQ (not synchronous), parse-and-discard .dem files (not disk bloat), expiry validation at submission time

### Phase 2: Core Data Visualizations
**Rationale:** Once parse data is flowing into PostgreSQL, the visualization layer is relatively low-risk and delivers immediate user value. These features (laning, gold/XP, heatmap) prove the replay data is being correctly extracted and give users something tangible to look at while AI analysis is being built. Laning and gold/XP charts share much of the same data model. Heatmap requires coordinate normalization (establish this pattern early).
**Delivers:** Laning phase breakdown, gold/XP timeline charts, death density heatmap on minimap, ward placement map.
**Addresses features:** Laning breakdown (P1), gold/XP graphs (P1), death heatmap (P1), ward map (P2)
**Implements:** Canvas-based heatmap renderer (not SVG), Recharts timeline with shadcn/ui wrappers, coordinate system normalization layer
**Avoids pitfalls:** Canvas over SVG for heatmap (SVG breaks at 1,000+ data points), server-side position aggregation before sending to frontend

### Phase 3: AI Analysis Engine
**Rationale:** The rules engine and LLM integration layer are the core differentiators. They depend on Phase 1 (parse data) and benefit from Phase 2 (understanding the data shape). The hybrid architecture (rules detect, LLM explains) must be enforced here — do not shortcut to pure LLM analysis. Rotation analysis should ship before itemization audit because itemization requires the meta data scraping pipeline (OpenDota API integration) which adds its own complexity.
**Delivers:** AI rotation analysis, natural language match summary, and the rules engine framework that all future AI features extend.
**Addresses features:** AI rotation analysis (P1), natural language match summary (P1)
**Uses stack:** Anthropic SDK with `generateObject()` via Vercel AI SDK, Zod schemas for structured output, pino for logging LLM calls
**Avoids pitfalls:** Rules engine provides facts, LLM only explains; prompt includes current patch context; output validated against parsed data before display

### Phase 4: Enriched Analysis and Meta Data
**Rationale:** AI itemization audit requires a meta build baseline, which means integrating the OpenDota hero stats API. This is a separate data pipeline from replay parsing and should be implemented after the core AI analysis is working. Timeline slider with event annotations, teamfight breakdowns, and death log also belong here as they enrich the presentation layer built in Phase 2.
**Delivers:** AI itemization audit, meta data service (OpenDota API caching), interactive timeline slider with event annotations, teamfight breakdown with contribution scores, death log / kill feed.
**Addresses features:** AI itemization audit (P2), timeline slider (P2), teamfight breakdown (P2), death log (P2)
**Avoids pitfalls:** OpenDota API for meta data (not Dotabuff scraping), aggressive caching of meta data (hero builds change per patch, not per minute)

### Phase 5: User Experience and Retention
**Rationale:** Once core analysis features are validated, user experience improvements and optional account features can be layered on. Steam account linking adds OAuth complexity that would distract from validating the core value proposition in earlier phases. This phase is deliberately post-validation.
**Delivers:** Steam account linking (optional), match history view, improved mobile responsiveness, share-via-URL for analysis results.
**Addresses features:** Steam account linking (P3)
**Note:** Cross-match personalized improvement focus (P3) is deferred to a potential v2 roadmap; it requires persistent user accounts and cross-match pattern detection which is a separate product surface.

### Phase Ordering Rationale

- **Pipeline-first ordering** is mandated by the feature dependency tree: every analysis feature requires parsed replay data. Building AI or visualization before the pipeline works is wasted effort.
- **Visualization before AI** because (a) it validates the parse data shape with human-readable output, (b) it delivers user value faster, and (c) the coordinate normalization and event extraction patterns needed for visualization are reused by the AI rules engine.
- **Rules engine before LLM integration** within Phase 3 — the rules engine is deterministic and testable without any external API calls. Get it right before adding LLM complexity on top.
- **Meta data service in Phase 4** because it is a prerequisite only for itemization audit (not rotation analysis), and rotation analysis is the higher-priority differentiator to validate first.
- This ordering directly avoids the critical Pitfall 4 (synchronous parsing) by forcing the async job queue architecture to be established in Phase 1 before any user-facing features exist that could tempt a shortcut.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Steam Game Coordinator integration (`node-steam-user`) has limited documentation; the fallback chain between OpenDota API and GC needs a proof-of-concept spike before committing to the implementation approach. GC rate limits and account management (Steam Guard disabled, dedicated alt account) need operational documentation.
- **Phase 3:** Rules engine design for rotation analysis is the hardest algorithmic problem in the product. Determining what constitutes a "missed rotation opportunity" requires careful definition of game state conditions (enemy hero HP threshold, TP cooldown, distance thresholds). This needs design work, not just implementation.
- **Phase 4:** OpenDota API rate limits (60 req/min without key, 50K calls/month free tier) need to be mapped against expected meta data refresh frequency and user volume before assuming the free tier is sufficient.

Phases with standard patterns (skip additional research):
- **Phase 2:** Recharts + shadcn/ui integration is well-documented with official examples. Canvas heatmap implementation has a clear reference algorithm (simpleheat by Mourner). Standard patterns apply.
- **Phase 5:** OAuth with Steam via Auth.js (next-auth v5) is well-documented. Share-via-URL is trivial. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technology choices sourced from official docs, npm packages, and OpenDota's production architecture. Version numbers verified. |
| Features | HIGH | Competitor landscape is well-documented (Dotabuff, OpenDota, STRATZ are public products). Differentiator features validated against what competitors explicitly do not offer. |
| Architecture | HIGH | Based on OpenDota's published post-mortems and architecture blog posts. Pipeline pattern is directly transferable to DotaGenius's scope. |
| Pitfalls | HIGH | Critical pitfalls (Steam API, replay expiry, parser schema) are sourced from OpenDota's "Lessons Learned" post (10M replays) and Valve GitHub issue tracker. These are documented failures, not speculation. |

**Overall confidence:** HIGH

### Gaps to Address

- **Replay URL fallback chain reliability:** It is unclear how often OpenDota has replay URLs available vs. requiring Steam GC. If OpenDota coverage is low, GC becomes the primary path and the Steam account management burden increases. Validate with a sample of match IDs during the Phase 1 spike.
- **BullMQ worker hosting model:** The odota/parser Docker container and BullMQ workers need persistent processes. The hosting split (Vercel for Next.js frontend/API, Railway or Fly.io for workers and parser) needs a final decision. Railway is simpler; Fly.io gives more control. This affects both cost and deployment complexity.
- **LLM cost model:** Claude Sonnet costs money per call. A single match analysis with rotation and itemization findings could involve multiple LLM calls. Need to establish a cost estimate per analysis and determine the freemium pricing model before Phase 3.
- **Parser mode coverage:** Clarity handles standard Ranked/Unranked matches well, but behavior on Turbo mode, ability draft, and bot matches is uncertain. Decide which game modes are in scope before Phase 1 ships; filter unsupported modes early to avoid user confusion.

## Sources

### Primary (HIGH confidence)
- [OpenDota: Lessons Learned From Parsing 10M Replays](https://blog.opendota.com/2016/05/13/learnings/) — infrastructure pitfalls, async architecture, parser reliability
- [odota/parser GitHub](https://github.com/odota/parser) — Java parse server, HTTP interface, JSON output format
- [skadistats/clarity GitHub](https://github.com/skadistats/clarity) — Clarity 3.1.x parser, protobuf versioning, update cadence
- [OpenDota API Documentation](https://docs.opendota.com/) — rate limits, `/replays`, `/heroStats`, `/heroes/{id}/itemPopularity`
- [Next.js 16.2 Blog Post](https://nextjs.org/blog/blog/next-16-2-turbopack) — Turbopack stability, App Router, Server Components
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) — v0.45.1, 7.4kb, zero dependencies
- [BullMQ Documentation](https://docs.bullmq.io) — Redis-backed job queue, worker patterns
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) — GA structured outputs, no beta header required

### Secondary (MEDIUM confidence)
- [DeepWiki: OpenDota Core Architecture](https://deepwiki.com/odota/core) — queue systems and data flow patterns
- [simpleheat GitHub (mourner)](https://github.com/mourner/simpleheat) — Canvas heatmap reference algorithm
- [STRATZ](https://stratz.com/) — competitor feature reference for playback and IMP scoring
- [WebAtlas](https://webatlas.online/) — AI coaching competitor, API-only (no replay parsing)
- [Rendering One Million Datapoints with D3/WebGL](https://blog.scottlogic.com/2020/05/01/rendering-one-million-points-with-d3.html) — SVG vs Canvas vs WebGL performance benchmarks

### Tertiary (LOW confidence / needs validation)
- [node-steam-user](https://github.com/nicklvsa/node-steam-user) — Steam GC integration; exact rate limits and alt-account requirements need hands-on validation during Phase 1 spike
- [GetMatchDetails API issues (Valve GitHub)](https://github.com/ValveSoftware/Dota2-Gameplay/issues/17910) — confirms `replay_salt` removal, but Valve's current state may differ from issue thread

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
