# DotaGenius

## What This Is

A Dota 2 replay analysis tool that turns raw match data into actionable gameplay insights. Users enter a Match ID, and DotaGenius downloads the replay, parses hero positions and combat logs, runs AI-powered analysis (rotation timing, itemization audits), and presents results through interactive visualizations like heatmaps and timeline sliders. Built for any Dota player — casual to competitive — who wants to understand what happened and why.

## Core Value

A player enters a Match ID and gets clear, actionable insights about their gameplay — what went wrong, what went right, and what to do differently.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Replay pipeline: download .dem file from Steam via Match ID, parse hero positions and combat logs, store in queryable format
- [ ] AI rotation analysis: detect poor rotation timing (e.g., support stayed in lane during a gank opportunity)
- [ ] AI itemization audit: compare player's build against meta builds for the specific hero/matchup
- [ ] Mini-map heatmap: SVG overlay showing death density for the player
- [ ] Timeline slider: scrub through game time to see net worth spikes and key events
- [ ] Meta data sourcing: scrape Dotabuff for popular builds and hero stats
- [ ] Hybrid AI approach: rule-based detection with LLM-powered explanations

### Out of Scope

- Steam account linking / auto-pull matches — v2 feature, v1 uses manual Match ID entry
- Hardware optimization / FPS-latency correlation — nice to have, defer to v2+
- Mobile app — web-first
- Real-time match tracking — replay analysis only

## Context

- Dota 2 replays are `.dem` (protobuf) files downloadable via Steam Web API
- OpenDota and Dotabuff are existing data sources for meta builds and match metadata
- Replay parsing is CPU-intensive; existing parsers like Clarity (Java) or Manta (Go) handle the protobuf format
- The AI layer is hybrid: deterministic rules identify patterns (rotation timing, item timing windows), then an LLM generates natural-language explanations and recommendations
- Target audience ranges from casual players curious about a bad game to grinders analyzing every match

## Constraints

- **Data source**: Valve's replay API has rate limits and replays expire after ~2 weeks
- **Parsing complexity**: .dem files are binary protobuf; need a reliable parser library
- **Meta freshness**: Dotabuff data needs periodic scraping to stay current with patches

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Match ID entry for v1 (no Steam auth) | Simplifies MVP, avoids OAuth complexity | — Pending |
| Hybrid AI (rules + LLM) | Rules for reliable detection, LLM for human-readable insights | — Pending |
| Scrape Dotabuff for meta data | Richest source of hero build data and win rates | — Pending |

---
*Last updated: 2026-03-20 after initialization*
