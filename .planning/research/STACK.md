# Technology Stack

**Project:** DotaGenius - Dota 2 Replay Analysis Tool
**Researched:** 2026-03-20

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.2 | Full-stack framework | Current stable. Turbopack is default bundler (5-10x faster refresh). App Router provides server components for heavy data rendering, API routes for the replay pipeline, and Server Actions for form submissions. The Dota analysis dashboard is a classic SSR use case -- pages are data-heavy but not real-time. | HIGH |
| TypeScript | 5.7+ | Type safety | Non-negotiable for a project with complex game data schemas (hero positions, combat logs, item builds). Drizzle ORM and tRPC both leverage TS inference heavily. | HIGH |
| React | 19 | UI library | Ships with Next.js 16. Server Components reduce client bundle for the data-dense analysis pages. | HIGH |
| Tailwind CSS | 4.x | Styling | Utility-first CSS, first-class Next.js support. v4 uses CSS-first configuration and the Oxide engine for faster builds. | HIGH |

### Database

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| PostgreSQL | 16+ | Primary database | Relational data with JSON columns for semi-structured replay data. PostGIS extension available if spatial queries on map coordinates become useful. Handles the mix of structured (users, matches, heroes) and semi-structured (parsed replay events, combat logs) data well. | HIGH |
| Drizzle ORM | 0.45.x | Database ORM | ~7.4kb, zero dependencies, full TypeScript inference. SQL-like query builder avoids the "ORM abstraction leak" problem. Drizzle Kit provides migration tooling and Drizzle Studio for data browsing. Chosen over Prisma because Prisma's query engine adds latency and bundle size that matter in a Next.js serverless context. | HIGH |
| Redis | 7.x | Caching + Job queue backing | Required by BullMQ for job queues. Also serves as cache layer for OpenDota API responses and parsed replay data. Upstash Redis works for serverless if self-hosting is not desired. | HIGH |

### Replay Pipeline

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| odota/parser | latest (Docker) | .dem replay parsing | Java-based parser built on Clarity 3.1.x. Accepts POST of .dem file, returns line-delimited JSON with combat logs, entity data, hero positions, ward placements. Battle-tested by OpenDota (processes millions of replays). Run as a sidecar Docker container -- your Node.js backend POSTs the .dem file and gets structured JSON back. This is the single most important infrastructure choice. | HIGH |
| BullMQ | 5.x | Job queue for replay processing | Replay parsing is CPU-intensive (10-60 seconds per replay). BullMQ provides Redis-backed queues with retries, priorities, rate limiting, and progress tracking. User submits Match ID -> job queued -> worker downloads .dem -> POSTs to parser -> stores results. Essential for not blocking the web server. | HIGH |
| node-steam-user | latest | Steam GC communication | Required to get replay_salt and cluster from Dota 2 Game Coordinator. The public Steam Web API's GetMatchDetails does NOT always include replay_salt. You need a Steam bot account that connects to the Dota 2 GC to request match details with replay info. | MEDIUM |

### AI / Analysis Layer

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Anthropic Claude API | claude-sonnet-4-6 | LLM-powered explanations | Structured outputs (GA, no beta header) for guaranteed JSON schema compliance. The hybrid approach: rules engine detects patterns (rotation timing, item timing windows) in parsed JSON, then Claude generates natural-language explanations. Sonnet 4.6 balances cost and quality for analysis tasks. Tool use enables agentic workflows if needed later. | HIGH |
| Custom rules engine | N/A | Deterministic pattern detection | TypeScript functions that analyze parsed replay JSON: rotation timing (hero position deltas), itemization comparison (player build vs meta), death clustering, net worth spikes. These produce structured findings that feed into Claude prompts. Do NOT use an LLM for pattern detection -- it is unreliable and expensive. Rules detect, LLM explains. | HIGH |
| Vercel AI SDK | 4.x | LLM integration helpers | Provides `generateObject()` with Zod schema validation, streaming, and provider abstraction. Works with Anthropic provider out of the box. Handles the boilerplate of structured LLM calls. | MEDIUM |

### Visualization

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Recharts | 2.x | Charts (net worth, XP timelines) | Built on React + D3. shadcn/ui provides pre-styled Recharts components (area, line, bar charts). The timeline slider for net worth spikes maps directly to a Recharts AreaChart with a Brush component for scrubbing. | HIGH |
| Custom Canvas heatmap | N/A | Mini-map death density | Build a custom Canvas-based heatmap renderer on top of the Dota 2 minimap image. heatmap.js (v2.0.5) is an option but hasn't been updated in 9 years. For a 127x127 tile minimap overlay, a custom `<canvas>` with Gaussian blur is ~50 lines of code and avoids a stale dependency. Use the simpleheat algorithm (MIT, by Mourner of Leaflet fame) as reference. | MEDIUM |
| shadcn/ui | latest | UI component library | Copy-paste Radix-based components. Provides accessible Slider (for timeline scrubbing), Tabs, Cards, Dialog, and the Recharts chart wrappers. Not an npm dependency -- components are copied into your codebase, so no version lock-in. | HIGH |
| Framer Motion | 12.x | Animations | Smooth transitions for analysis card reveals, tab switches, heatmap overlays. Keep usage minimal -- this is a data tool, not a marketing site. | LOW |

### Infrastructure

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Docker Compose | latest | Local dev orchestration | Runs PostgreSQL, Redis, and odota/parser as containers alongside the Next.js dev server. Essential because the parser is a Java service. | HIGH |
| Vercel | N/A | Frontend hosting | Next.js 16 deploys natively. Edge functions for API routes, ISR for any static content. Free tier is generous for MVP. | MEDIUM |
| Railway / Fly.io | N/A | Backend services hosting | The odota/parser Docker container and BullMQ workers need persistent processes (not serverless). Railway provides managed PostgreSQL + Redis + Docker containers in one platform. Fly.io is the alternative. Choose one. | MEDIUM |
| GitHub Actions | N/A | CI/CD | Lint, type-check, test, deploy. Standard. | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 3.x | Runtime schema validation | Validate API inputs, parsed replay data shape, LLM output schemas. Used everywhere. |
| date-fns | 4.x | Date manipulation | Game timestamps, replay age calculation, "2 weeks until expiry" warnings. |
| ky | 1.x | HTTP client | Fetch wrapper for OpenDota API calls and Steam API calls. Lighter than axios. |
| @tanstack/react-query | 5.x | Server state management | Cache and deduplicate API calls on the client. Polling for replay parse job status. |
| next-auth (Auth.js) | 5.x | Authentication | Optional for v1 (no auth needed for Match ID entry), but wire it up early if you plan user accounts in v2. |
| pino | 9.x | Logging | Structured JSON logging for the replay pipeline. Essential for debugging parse failures. |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 | Remix / SvelteKit | Next.js has the largest ecosystem, best Vercel integration, and React Server Components are ideal for data-heavy pages. Remix is solid but smaller ecosystem. SvelteKit would require learning Svelte. |
| ORM | Drizzle | Prisma | Prisma's query engine binary adds cold start latency in serverless. Drizzle is lighter, faster, and gives you SQL-level control. Prisma Studio is nicer, but Drizzle Studio is catching up. |
| Replay parser | odota/parser (Java/Clarity) | Manta (Go) / source2-demo (Rust) | odota/parser outputs line-delimited JSON over HTTP -- perfect for a Node.js backend. Manta requires Go integration. source2-demo is a Rust library with no npm/WASM package. Clarity (inside odota/parser) is the most battle-tested parser in the Dota ecosystem. |
| Job queue | BullMQ | Inngest / Trigger.dev | BullMQ is proven, self-hosted, and gives full control over retry logic. Inngest/Trigger.dev are SaaS with vendor lock-in. For CPU-heavy replay parsing, you want control over worker scaling. |
| LLM | Claude (Anthropic) | OpenAI GPT-4o | Claude's structured outputs are GA with no beta header. Claude Sonnet 4.6 is cost-effective. OpenAI is a fine alternative -- the architecture is provider-agnostic via Vercel AI SDK. |
| Heatmap | Custom Canvas | deck.gl / heatmap.js | deck.gl is overkill for a single minimap overlay (it is a WebGL framework for geospatial data). heatmap.js works but is unmaintained (last update 2017). Custom canvas is ~50 lines and exactly fits the minimap use case. |
| Charts | Recharts | D3.js / Victory / Nivo | Recharts has first-class shadcn/ui integration. D3 is too low-level for standard charts. Victory and Nivo are fine but lack the shadcn/ui component wrappers. |
| Hosting | Vercel + Railway | AWS / Self-hosted | Vercel + Railway minimize DevOps for a solo/small team. AWS is overkill for MVP. Move to AWS later if scale demands it. |

## Key Architecture Decisions in Stack

### Why Docker for the Parser (Not npm)

The Dota 2 .dem format is complex binary protobuf. The only production-grade parsers are:
- **Clarity** (Java) - used by OpenDota, Dotabuff
- **Manta** (Go) - used by Dotabuff
- **source2-demo** (Rust) - newer, less proven

There is no reliable JavaScript/TypeScript .dem parser. The `rapier` npm package exists but is not production-ready and not actively maintained. Accept that parsing is a polyglot problem: run Clarity via odota/parser as a Docker sidecar, communicate via HTTP.

### Why Hybrid AI (Not Pure LLM)

LLMs are bad at: counting, precise timing comparisons, consistent numerical analysis.
LLMs are good at: explaining patterns, contextualizing findings, generating coaching advice.

The rules engine handles: "Support was >2000 units from the gank at timestamp 14:32, arrived 8 seconds late."
The LLM handles: "Your Lion was farming the small camp when the enemy mid rotated. Consider placing an observer ward at the rune spot to anticipate rotations."

### Why Not Real-time Parsing

Replay parsing takes 10-60 seconds. This is a background job, not a request-response cycle. The user submits a Match ID and either waits (with progress updates via polling or SSE) or gets notified when done. BullMQ handles this cleanly.

## Installation

```bash
# Core Next.js app
npx create-next-app@latest dotagenius --typescript --tailwind --app --turbopack

# Database
npm install drizzle-orm postgres
npm install -D drizzle-kit

# Job queue
npm install bullmq ioredis

# AI
npm install @anthropic-ai/sdk ai @ai-sdk/anthropic

# Validation
npm install zod

# UI
npx shadcn@latest init
npx shadcn@latest add button card tabs slider chart

# Visualization
npm install recharts

# Data fetching
npm install @tanstack/react-query ky

# Utilities
npm install date-fns pino

# Dev dependencies
npm install -D @types/node prettier eslint
```

```yaml
# docker-compose.yml services
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  parser:
    image: odota/parser
    ports: ["5600:5600"]
```

## Data Flow Summary

```
User enters Match ID
  -> API route validates input (Zod)
  -> BullMQ job created
  -> Worker: fetch replay_salt from Steam GC (node-steam-user)
  -> Worker: download .dem.bz2 from Valve CDN
  -> Worker: decompress bz2
  -> Worker: POST .dem to odota/parser:5600
  -> Worker: receive line-delimited JSON
  -> Worker: run rules engine on parsed data
  -> Worker: store results in PostgreSQL (Drizzle)
  -> Worker: call Claude API for natural-language analysis
  -> Worker: store AI insights in PostgreSQL
  -> Frontend polls for completion (React Query)
  -> Frontend renders: heatmap (Canvas), timeline (Recharts), insights (Cards)
```

## Sources

- [odota/parser - GitHub](https://github.com/odota/parser) - Java replay parse server, line-delimited JSON output
- [skadistats/clarity - GitHub](https://github.com/skadistats/clarity) - Clarity 3.1.3, underlying Java parser
- [dotabuff/manta - GitHub](https://github.com/dotabuff/manta) - Go parser alternative (not recommended)
- [Rupas1k/source2-demo - GitHub](https://github.com/Rupas1k/source2-demo) - Rust parser alternative (not recommended)
- [Next.js 16.2 Blog Post](https://nextjs.org/blog/next-16-2-turbopack) - Turbopack stability, Server Fast Refresh
- [Drizzle ORM npm](https://www.npmjs.com/package/drizzle-orm) - v0.45.1, 7.4kb, zero deps
- [BullMQ Documentation](https://docs.bullmq.io) - Redis-backed job queue
- [OpenDota API Documentation](https://docs.opendota.com/) - 50k free calls/month, 60 req/min
- [Claude Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) - GA, no beta header
- [Recharts](https://recharts.org/) - React chart library with shadcn/ui integration
- [heatmap.js](https://www.patrick-wied.at/static/heatmapjs/) - v2.0.5, last updated 2017 (not recommended)
- [simpleheat - GitHub](https://github.com/mourner/simpleheat) - Reference algorithm for custom canvas heatmap
- [shadcn/ui Charts](https://ui.shadcn.com/docs/components/radix/chart) - Recharts wrappers
