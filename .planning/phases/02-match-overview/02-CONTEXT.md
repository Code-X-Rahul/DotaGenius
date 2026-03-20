# Phase 2: Match Overview - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Show users their match stats, laning breakdown, and gold/XP graphs from parsed data. This phase replaces the minimal "complete" view on the match page with a full match overview. No visualizations (heatmaps, ward maps) or AI analysis — those are Phase 3 and 4.

</domain>

<decisions>
## Implementation Decisions

### Match Result Header
- 5v5 hero portrait strip layout: row of hero icons per team with score underneath
- Winning team gets a highlight/glow effect (Claude's discretion on color — fits existing dark theme)
- Metadata row below: match ID, region, date played, lobby type
- Hero images sourced from OpenDota/Steam CDN (https://cdn.cloudflare.steamstatic.com) via hero ID mapping — no local assets
- Duration and game mode displayed prominently

### Focus Player Selection
- Manual selection: user clicks a hero/player row in the scoreboard to set focus
- No auto-detection (Steam account linking is v2)
- Focus player is highlighted in scoreboard and used for laning context

### Scoreboard
- Two separate tables stacked vertically: Radiant table, then Dire table
- All stat columns shown: K/D/A, LH/DN, GPM, XPM, Hero DMG, Tower DMG, Healing, Net Worth
- Full item build displayed: 6 item slots + neutral item
- Benchmarks shown as color-coded stat text (green = top 30%, yellow = average, red = bottom 30%)
- Click a player row → sets focus player (highlighted)
- Expand icon on each row → reveals detail panel with:
  - Purchase timeline (chronological item purchases)
  - Ability build (skill point allocation)
  - Damage breakdown (dealt by ability, taken by source)
  - Wards placed (observer + sentry counts)
  - Runes picked up

### Laning Breakdown
- Three per-lane cards: Top, Mid, Bot
  - Each card shows hero matchup: both players' hero icons, CS@10, lane efficiency
  - Lane outcome determined by lane_efficiency comparison (OpenDota's calculated field)
  - Mini CS line chart per lane showing LH/DN accumulation for first 10 minutes (from lhT/dnT arrays)
- Separate section below for jungling and roaming players
  - Shows stacks, rotations, and their own stats
  - Uses is_roaming and lane data to classify

### Gold/XP Graphs
- Tabbed interface: "Advantage" tab (default) and "Per Player" tab
- **Advantage graph**: Single line showing Radiant gold/XP lead over time (from radiantGoldAdv/radiantXpAdv arrays). Positive = Radiant ahead.
- **Per-player graph**: 10 individual lines color-coded by team showing net worth over time (from goldT arrays per player)
- Interactive: hover tooltips showing exact values at game time
- Clickable objective markers on the timeline: tower kills, Roshan, first blood, courier kills, barracks destructions (from objectives JSON)
- Built with Recharts library

### Claude's Discretion
- Winning team highlight color choice (within existing dark theme CSS variables)
- Exact expand/collapse animation for detail panels
- Mobile responsive layout (table scroll vs card stack)
- Graph color palette for 10 player lines
- How to handle matches where OpenDota has no parsed data (gold_t empty)

</decisions>

<specifics>
## Specific Ideas

- Scoreboard should feel like Dotabuff/OpenDota match pages — familiar to Dota players
- Benchmarks add a layer existing sites don't emphasize — "how did I do vs similar-rank players"
- The per-lane cards with mini CS charts make laning phase analysis immediately visual without needing Phase 3 visualizations

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatusTimeline` component: Timeline pattern could inform graph event markers
- CSS custom properties (`--card-bg`, `--card-border`, `--accent`, `--muted`, `--success`, `--error`): Full dark theme system
- `useJobStatus` hook: SSE pattern for real-time updates
- `formatDuration()` and `gameModeLabel()` in match page: Already implemented utilities

### Established Patterns
- Card styling: `rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]`
- Layout: Centered max-width container with `px-6` padding
- Font: Monospace for match IDs, regular for content
- API route pattern: `/api/matches/[matchId]` with BigInt serialization

### Integration Points
- Match page (`src/app/match/[matchId]/page.tsx`): Replace the minimal "complete" view with full overview
- GET API route (`src/app/api/matches/[matchId]/route.ts`): Expand response to include all new player fields and match-level data
- Player model: goldT, xpT, lhT, dnT (JSON arrays), lane, laneRole, laneEfficiency, benchmarks, all stats
- Match model: radiantGoldAdv, radiantXpAdv (JSON arrays), objectives, teamfights, radiantScore, direScore

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-match-overview*
*Context gathered: 2026-03-20*
