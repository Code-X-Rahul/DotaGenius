# Phase 1: Replay Pipeline - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Accept a Match ID, download the .dem replay file, parse it with Clarity (via odota/parser Docker sidecar), and store structured data in PostgreSQL. Includes the landing page with Match ID entry, job status page, and the complete backend pipeline. Frontend visualization and AI analysis are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Match ID Entry UX
- Landing page has a hero section explaining DotaGenius at top, search bar, then recent analyses below
- Recent analyses section shows browser-local history (localStorage) on top, globally popular analyses below
- If a match was already analyzed, show cached results immediately with a "re-analyze" button
- After submitting a Match ID, redirect to a dedicated status page showing pipeline steps: downloading → parsing → complete
- Client-side validation on Match ID input (numeric, ~10 digits) before allowing submission

### Replay Acquisition Strategy
- OpenDota API is the primary source for replay URLs
- Steam Game Coordinator bot is the fallback — validate with a proof-of-concept spike FIRST before building the rest of the pipeline
- If the GC spike fails (unreliable or rate-limited), ship with OpenDota-only and accept some matches won't be available
- Include a setup guide for creating a dedicated Steam bot account for GC access

### Error Handling
- Expired replays: warn user if match is >10 days old ("replay may be unavailable") but still attempt download; fail gracefully if unavailable
- All game modes supported (All Pick, Turbo, Ability Draft, custom games — everything)
- Invalid Match IDs caught client-side before submission

### Data Extraction & Storage
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

</decisions>

<specifics>
## Specific Ideas

- Landing page should feel like a product — hero section that explains what DotaGenius does for first-time visitors, not just a raw input field
- The "recent analyses" dual-section (your history + popular) makes the site feel alive even for new visitors
- Steam GC spike is the very first task — if it doesn't work, the rest of the pipeline still ships with OpenDota-only

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project

### Established Patterns
- None — patterns will be established in this phase

### Integration Points
- odota/parser Docker sidecar on port 5600 (HTTP API accepting POST with .dem file)
- OpenDota API for replay URLs and match metadata
- Steam Game Coordinator via node-steam-user for fallback replay acquisition
- BullMQ + Redis for async job queue
- PostgreSQL for parsed data storage

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-replay-pipeline*
*Context gathered: 2026-03-20*
