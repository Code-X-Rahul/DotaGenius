# Requirements: DotaGenius

**Defined:** 2026-03-20
**Core Value:** A player enters a Match ID and gets clear, actionable insights about their gameplay — what went wrong, what went right, and what to do differently.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Replay Pipeline

- [x] **PIPE-01**: User can enter a Match ID and system downloads the .dem replay file
- [ ] **PIPE-02**: System parses .dem file to extract hero positions, combat logs, and entity snapshots
- [x] **PIPE-03**: Parsed data is stored in PostgreSQL for fast retrieval

### Match Overview

- [ ] **MATC-01**: User sees basic match summary (KDA, GPM, XPM, items, hero, duration, outcome)
- [ ] **MATC-02**: User sees laning phase breakdown (lane assignments, CS at 10 min, lane outcome)
- [ ] **MATC-03**: User sees gold/XP graphs over time for all players

### Visualization

- [ ] **VIZN-01**: User sees death density heatmap on Canvas minimap overlay
- [ ] **VIZN-02**: User can scrub timeline slider to see net worth spikes and key events
- [ ] **VIZN-03**: User sees ward placement locations on minimap
- [ ] **VIZN-04**: User sees teamfight breakdown with per-player contribution scores

### AI Analysis

- [ ] **AIAN-01**: System detects poor rotation timing and explains with LLM-generated coaching
- [ ] **AIAN-02**: System compares player's item build against meta builds for the hero/matchup
- [ ] **AIAN-03**: System generates natural language match summary explaining what happened and why

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Account & Convenience

- **ACCT-01**: User can link Steam account for automatic match discovery
- **ACCT-02**: User sees match history from linked Steam account
- **ACCT-03**: User can share match analysis via URL

### Advanced Analysis

- **ADVN-01**: System identifies patterns across multiple matches (cross-match coaching)
- **ADVN-02**: User sees 2D minimap playback with hero dots moving over time

### Infrastructure

- **INFR-01**: System correlates FPS/latency logs with teamfight intensity (hardware optimization)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time in-game overlay | Completely different architecture, Valve ToS concerns, separate product |
| MMR tracking / rank progression | Valve restricted public MMR data, existing tools dominate this space |
| Social features (friends, leaderboards) | Scope creep, orthogonal to analysis quality |
| Full match replay viewer (video) | Dota 2 client does this better, absurd scope |
| Pro player build recommendations | Dotabuff/Dota2ProTracker dominate, use their data as input instead |
| Multi-language support | Premature for v1, LLM outputs need per-language prompt engineering |
| Mobile app | Web-first, players review replays on desktop |
| Dotabuff scraping for meta data | Anti-bot detection blocks scrapers; use OpenDota API instead |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PIPE-01 | Phase 1 | Complete |
| PIPE-02 | Phase 1 | Pending |
| PIPE-03 | Phase 1 | Complete |
| MATC-01 | Phase 2 | Pending |
| MATC-02 | Phase 2 | Pending |
| MATC-03 | Phase 2 | Pending |
| VIZN-01 | Phase 3 | Pending |
| VIZN-02 | Phase 3 | Pending |
| VIZN-03 | Phase 3 | Pending |
| VIZN-04 | Phase 3 | Pending |
| AIAN-01 | Phase 4 | Pending |
| AIAN-02 | Phase 4 | Pending |
| AIAN-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after roadmap creation*
