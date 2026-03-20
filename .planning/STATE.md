---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 1 context gathered
last_updated: "2026-03-20T11:24:38.407Z"
last_activity: 2026-03-20 — Roadmap created, traceability mapped
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-20)

**Core value:** A player enters a Match ID and gets clear, actionable insights about their gameplay — what went wrong, what went right, and what to do differently.
**Current focus:** Phase 1 — Replay Pipeline

## Current Position

Phase: 1 of 4 (Replay Pipeline)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-20 — Roadmap created, traceability mapped

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: Use OpenDota API as primary replay URL source (not Steam Web API — replay_salt removed by Valve)
- [Phase 1]: BullMQ + Redis for async job queue — mandatory from day one, not retrofittable
- [Phase 1]: odota/parser Docker sidecar (Clarity Java) — only viable production .dem parser
- [Phase 4]: Hybrid AI: TypeScript rules engine detects patterns, LLM only explains findings (never raw replay data to LLM)
- [All]: OpenDota API for meta data — Dotabuff has anti-bot detection and no public API

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Steam GC fallback (`node-steam-user`) has limited documentation — needs proof-of-concept spike before committing to implementation
- [Phase 1]: Unclear how often OpenDota has replay URLs vs. requiring Steam GC; validate with sample match IDs during Phase 1
- [Phase 1]: Hosting split decision pending (Vercel for Next.js, Railway vs. Fly.io for workers and parser container)
- [Phase 4]: LLM cost per analysis unknown — establish cost estimate before building AI layer

## Session Continuity

Last session: 2026-03-20T11:24:38.396Z
Stopped at: Phase 1 context gathered
Resume file: .planning/phases/01-replay-pipeline/01-CONTEXT.md
