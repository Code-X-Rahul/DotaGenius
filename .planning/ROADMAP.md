# Roadmap: DotaGenius

## Overview

DotaGenius is built in four phases that follow the natural dependency chain of a pipeline product. The replay pipeline is the foundation everything else rests on — no feature works without it. Once parsed data flows into PostgreSQL, match overview data gives users immediate signal that the system works. Visualizations then make the spatial and temporal data tangible. Finally, the AI analysis layer delivers the core differentiators: rotation coaching, itemization audits, and natural-language match summaries.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Replay Pipeline** - Accept a Match ID, download the .dem file, parse it with Clarity, and store structured data in PostgreSQL
- [ ] **Phase 2: Match Overview** - Show users their match stats, laning breakdown, and gold/XP graphs from parsed data
- [ ] **Phase 3: Visualizations** - Spatial and interactive views: death heatmap, ward placement, timeline slider, teamfight breakdown
- [ ] **Phase 4: AI Analysis** - Rules-engine pattern detection with LLM-generated coaching: rotation analysis, itemization audit, match summary

## Phase Details

### Phase 1: Replay Pipeline
**Goal**: Users can submit a Match ID and the system downloads, parses, and stores the replay for analysis
**Depends on**: Nothing (first phase)
**Requirements**: PIPE-01, PIPE-02, PIPE-03
**Success Criteria** (what must be TRUE):
  1. User submits a Match ID and sees a job status page that updates (submitted → downloading → parsing → complete)
  2. Parsed replay data (hero positions, combat logs, entity snapshots) is queryable in PostgreSQL after job completes
  3. System rejects expired Match IDs (older than ~10 days) with a clear error message before attempting download
  4. Async job queue handles parsing without blocking the web server — submitting a Match ID returns immediately
**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, database schema, test infrastructure
- [x] 01-02-PLAN.md — Steam GC spike (proof-of-concept for replay_salt retrieval) -- RESULT: GC failed, OpenDota-only
- [ ] 01-03-PLAN.md — Backend pipeline (OpenDota client, parser client, BullMQ worker, API endpoint)
- [ ] 01-04-PLAN.md — Frontend (landing page, status page, SSE updates)
- [ ] 01-05-PLAN.md — Integration wiring, integration tests, end-to-end verification

### Phase 2: Match Overview
**Goal**: Users can see meaningful match statistics immediately after analysis completes
**Depends on**: Phase 1
**Requirements**: MATC-01, MATC-02, MATC-03
**Success Criteria** (what must be TRUE):
  1. User sees a match summary card showing KDA, GPM, XPM, final items, hero played, game duration, and win/loss
  2. User sees laning phase breakdown: lane assignments, CS at 10 minutes, and lane outcome for each lane
  3. User sees gold and XP graphs over time for all 10 players with visible momentum shifts
**Plans**: TBD

### Phase 3: Visualizations
**Goal**: Users can explore spatial and temporal data through interactive maps and timeline controls
**Depends on**: Phase 2
**Requirements**: VIZN-01, VIZN-02, VIZN-03, VIZN-04
**Success Criteria** (what must be TRUE):
  1. User sees a minimap overlay with death density heatmap showing where deaths clustered during the game
  2. User sees ward placement locations (observer and sentry) overlaid on the minimap
  3. User can scrub a timeline slider to see net worth and XP values update at any point in the match
  4. User sees teamfight breakdown listing each fight with per-player contribution scores (damage, healing, kills/assists)
**Plans**: TBD

### Phase 4: AI Analysis
**Goal**: Users receive AI-powered coaching that explains what happened and how to improve
**Depends on**: Phase 3
**Requirements**: AIAN-01, AIAN-02, AIAN-03
**Success Criteria** (what must be TRUE):
  1. User sees rotation analysis findings: specific timestamps where a poor rotation occurred, the opportunity missed, and an LLM-generated explanation of why it mattered
  2. User sees itemization audit: their actual build compared against meta builds for the hero/matchup, with LLM-generated explanation of what to build differently and why
  3. User reads a natural language match summary that narrates the story of the game — what went well, what went wrong, and the top 2-3 things to do differently next time
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Replay Pipeline | 2/5 | Executing | - |
| 2. Match Overview | 0/TBD | Not started | - |
| 3. Visualizations | 0/TBD | Not started | - |
| 4. AI Analysis | 0/TBD | Not started | - |
