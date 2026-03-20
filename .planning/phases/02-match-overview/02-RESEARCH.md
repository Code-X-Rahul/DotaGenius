# Phase 2: Match Overview - Research

**Researched:** 2026-03-20
**Domain:** React data visualization, Dota 2 game data display, Recharts charting
**Confidence:** HIGH

## Summary

Phase 2 transforms the minimal "complete" status card on the match page into a full match overview with scoreboard, laning breakdown, and gold/XP graphs. The existing data pipeline (Phase 1) already stores all required fields in PostgreSQL -- player stats, time-series arrays (goldT, xpT, lhT, dnT), lane data, benchmarks, and match-level advantage arrays. The work is primarily frontend: expanding the API response to include all stored fields, building React components for the scoreboard/laning/graphs, and integrating Recharts for interactive charts.

The codebase uses Next.js 16, React 19, Tailwind CSS 4, and has an established dark theme with CSS custom properties. Hero and item images come from Valve's CDN at `cdn.cloudflare.steamstatic.com` with paths provided by the OpenDota constants API. Recharts v3.x is the user-selected charting library, which has significant changes from v2 (removed internal state management, SVG render-order-based z-index, accessibility enabled by default).

**Primary recommendation:** Build a hero/item constants lookup module first (maps IDs to names and image URLs), then layer scoreboard, laning cards, and Recharts graphs as separate components that compose into the match page.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 5v5 hero portrait strip layout: row of hero icons per team with score underneath
- Winning team gets a highlight/glow effect (Claude's discretion on color -- fits existing dark theme)
- Metadata row below: match ID, region, date played, lobby type
- Hero images sourced from OpenDota/Steam CDN (https://cdn.cloudflare.steamstatic.com) via hero ID mapping -- no local assets
- Duration and game mode displayed prominently
- Manual focus player selection: user clicks a hero/player row in the scoreboard to set focus
- No auto-detection (Steam account linking is v2)
- Two separate tables stacked vertically: Radiant table, then Dire table
- All stat columns: K/D/A, LH/DN, GPM, XPM, Hero DMG, Tower DMG, Healing, Net Worth
- Full item build: 6 item slots + neutral item
- Benchmarks shown as color-coded stat text (green = top 30%, yellow = average, red = bottom 30%)
- Click a player row -> sets focus player (highlighted)
- Expand icon -> reveals detail panel (purchase timeline, ability build, damage breakdown, wards placed, runes picked up)
- Three per-lane cards: Top, Mid, Bot with hero matchup, CS@10, lane efficiency, mini CS line chart
- Separate section for jungling and roaming players
- Tabbed graph interface: "Advantage" tab (default) and "Per Player" tab
- Advantage graph: single line showing Radiant gold/XP lead over time
- Per-player graph: 10 individual lines color-coded by team
- Interactive hover tooltips with exact values at game time
- Clickable objective markers on timeline (tower kills, Roshan, first blood, courier kills, barracks)
- Built with Recharts library

### Claude's Discretion
- Winning team highlight color choice (within existing dark theme CSS variables)
- Exact expand/collapse animation for detail panels
- Mobile responsive layout (table scroll vs card stack)
- Graph color palette for 10 player lines
- How to handle matches where OpenDota has no parsed data (gold_t empty)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MATC-01 | User sees basic match summary (KDA, GPM, XPM, items, hero, duration, outcome) | All data already stored in Player/Match models. Hero/item images via CDN + constants lookup. Scoreboard component with expandable rows. |
| MATC-02 | User sees laning phase breakdown (lane assignments, CS at 10 min, lane outcome) | Player model has lane, laneRole, laneEfficiency, isRoaming, lhT, dnT arrays. CS@10 = lhT[10]. Lane cards with mini Recharts LineChart. |
| MATC-03 | User sees gold/XP graphs over time for all players | Match model has radiantGoldAdv, radiantXpAdv arrays. Player model has goldT arrays. Recharts LineChart with CustomTooltip and objective markers from Match.objectives JSON. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8 | Interactive line charts for gold/XP graphs and mini laning charts | User-selected. Most popular React charting library (3.6M weekly downloads). Composable SVG-based components. |
| dotaconstants | latest | Hero ID -> name/image mapping, item ID -> name/image mapping, lobby types, regions | Official OpenDota constants package. Provides all Dota 2 game data lookups. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/image | (bundled) | Optimized hero/item images from CDN | All hero portraits and item icons. Handles lazy loading, sizing. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts | visx, nivo | Recharts is simpler for standard line charts; visx gives more control but more boilerplate. User locked Recharts. |
| dotaconstants | Fetch from OpenDota API at runtime | dotaconstants is a static JSON bundle -- no API calls, no rate limits, works offline. Runtime API adds latency and failure modes. |
| next/image for CDN | Plain img tags | next/image provides automatic optimization, but CDN images are already optimized PNGs. Use next/image with unoptimized prop or plain img -- either works. |

**Installation:**
```bash
npm install recharts dotaconstants
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/match/[matchId]/
│   └── page.tsx              # Existing -- refactor to compose overview components
├── components/match/
│   ├── MatchHeader.tsx       # Hero portrait strip + score + metadata
│   ├── Scoreboard.tsx        # Two team tables with expandable player rows
│   ├── PlayerRow.tsx         # Single player row with stats + expand toggle
│   ├── PlayerDetail.tsx      # Expanded detail panel (purchases, abilities, damage)
│   ├── LaningBreakdown.tsx   # Three lane cards + jungle/roaming section
│   ├── LaneCard.tsx          # Single lane matchup card with mini CS chart
│   ├── GoldXpGraphs.tsx      # Tabbed advantage/per-player graphs
│   └── ObjectiveMarker.tsx   # Clickable marker on graph timeline
├── lib/
│   ├── dota-constants.ts     # Hero/item/lobby lookups wrapping dotaconstants
│   └── match-utils.ts        # Data transforms: team splitting, CS@10, lane classification
└── hooks/
    └── useFocusPlayer.ts     # Focus player state (selected hero/player slot)
```

### Pattern 1: Dota Constants Lookup Module
**What:** Thin wrapper around `dotaconstants` that provides typed functions for hero/item data with CDN image URLs.
**When to use:** Every component that displays hero images, item icons, or game mode labels.
**Example:**
```typescript
// src/lib/dota-constants.ts
import heroes from "dotaconstants/build/heroes.json";
import items from "dotaconstants/build/items.json";
import lobbyTypes from "dotaconstants/build/lobby_type.json";
import regions from "dotaconstants/build/region.json";

const CDN_BASE = "https://cdn.cloudflare.steamstatic.com";

export function getHero(heroId: number) {
  const hero = (heroes as Record<string, any>)[String(heroId)];
  if (!hero) return null;
  return {
    id: hero.id,
    name: hero.localized_name as string,
    img: `${CDN_BASE}${hero.img}`,
    icon: `${CDN_BASE}${hero.icon}`,
  };
}

export function getItemImage(itemId: number): string | null {
  // Items in dotaconstants are keyed by internal name, but player data stores numeric IDs
  // Need to find item by id field
  const item = Object.values(items as Record<string, any>).find(
    (i) => i.id === itemId
  );
  if (!item || !item.img) return null;
  return `${CDN_BASE}${item.img}`;
}

export function getItemName(itemId: number): string {
  const item = Object.values(items as Record<string, any>).find(
    (i) => i.id === itemId
  );
  return item?.dname ?? "Unknown Item";
}
```

### Pattern 2: Player Slot Team Classification
**What:** OpenDota uses player_slot to determine team. Slots 0-127 are Radiant, 128-255 are Dire. The isRadiant boolean is also stored.
**When to use:** Splitting players into two team tables, coloring graph lines by team.
**Example:**
```typescript
// src/lib/match-utils.ts
export function isRadiantSlot(playerSlot: number): boolean {
  return playerSlot < 128;
}

export function getTeamPlayers(players: PlayerData[]) {
  return {
    radiant: players.filter((p) => p.isRadiant).sort((a, b) => a.playerSlot - b.playerSlot),
    dire: players.filter((p) => !p.isRadiant).sort((a, b) => a.playerSlot - b.playerSlot),
  };
}

export function getCsAt10(lhT: number[] | null): number {
  if (!lhT || lhT.length < 11) return 0;
  return lhT[10];
}
```

### Pattern 3: Recharts v3 Line Chart with Custom Tooltip
**What:** Recharts v3 uses SVG render order for z-index. Tooltip and Legend must appear after chart elements in JSX.
**When to use:** Gold/XP advantage and per-player graphs.
**Example:**
```typescript
// Gold advantage graph
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface AdvantagePoint { minute: number; gold: number; xp: number }

function AdvantageGraph({ data }: { data: AdvantagePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
        <XAxis dataKey="minute" stroke="var(--muted)" tick={{ fontSize: 12 }} />
        <YAxis stroke="var(--muted)" tick={{ fontSize: 12 }} />
        <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="gold" stroke="var(--warning)" dot={false} strokeWidth={2} />
        <Line type="monotone" dataKey="xp" stroke="var(--accent)" dot={false} strokeWidth={2} />
        <Tooltip content={<CustomTooltip />} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 4: Focus Player State
**What:** A React state hook that tracks which player is "focused" (clicked in scoreboard). Used to highlight the row and provide laning context.
**When to use:** Scoreboard click handler, laning breakdown highlighting.
**Example:**
```typescript
// src/hooks/useFocusPlayer.ts
import { useState, useCallback } from "react";

export function useFocusPlayer() {
  const [focusSlot, setFocusSlot] = useState<number | null>(null);
  const setFocus = useCallback((playerSlot: number) => {
    setFocusSlot((prev) => (prev === playerSlot ? null : playerSlot));
  }, []);
  return { focusSlot, setFocus };
}
```

### Pattern 5: Benchmark Color Coding
**What:** OpenDota benchmarks include a `pct` field (0.0-1.0) representing percentile. Color-code based on thresholds.
**When to use:** Stat text in scoreboard cells.
**Example:**
```typescript
export function benchmarkColor(pct: number | undefined): string {
  if (pct === undefined) return "var(--foreground)";
  if (pct >= 0.7) return "var(--success)";   // top 30%
  if (pct <= 0.3) return "var(--error)";     // bottom 30%
  return "var(--warning)";                    // average
}
```

### Anti-Patterns to Avoid
- **Fetching constants at runtime:** Do not call OpenDota `/api/constants/heroes` on every page load. Import from `dotaconstants` package statically.
- **Monolithic match page component:** Do not put all scoreboard + laning + graph logic in a single file. Split into focused components.
- **Hardcoded hero/item names:** Always use the constants lookup. Hero and item IDs change with patches.
- **Using Recharts v2 patterns:** Do not use `Customized` component with `CategoricalChartState`. Recharts v3 removed this. Use render-order for z-index.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Hero ID to name/image | Custom mapping object | `dotaconstants/build/heroes.json` | 140+ heroes, changes with patches, need img paths |
| Item ID to name/image | Custom item dictionary | `dotaconstants/build/items.json` | 200+ items, need CDN paths, neutrals included |
| Interactive charts | Custom SVG/Canvas graphs | Recharts v3 LineChart | Tooltips, responsive containers, animations are complex |
| Lobby type labels | Hardcoded switch statement | `dotaconstants/build/lobby_type.json` | 15+ types, localized names |
| Region names | Manual mapping | `dotaconstants/build/region.json` | Maps cluster IDs to region names |

**Key insight:** The `dotaconstants` package is the source of truth for all Dota 2 game metadata. It is maintained by the OpenDota team and updated with each Dota 2 patch. Rolling your own mappings means manual maintenance every patch.

## Common Pitfalls

### Pitfall 1: Item IDs vs Item Keys
**What goes wrong:** Items in `dotaconstants` are keyed by internal string name (e.g., "blink"), not by numeric ID. Player data stores numeric item IDs (e.g., 1).
**Why it happens:** OpenDota API uses numeric IDs in player data but string keys in constants.
**How to avoid:** Build an inverted index: `Record<number, ItemData>` mapping item.id to item data at module load time. Cache it.
**Warning signs:** All item images showing as "Unknown Item" or null.

### Pitfall 2: Empty Parsed Data
**What goes wrong:** Some matches have no parsed replay data from OpenDota (gold_t, xp_t are null/empty). Graphs break with empty arrays.
**Why it happens:** OpenDota may not have parsed the replay yet, or the match is too old.
**How to avoid:** Check for parsed data before rendering graphs/laning. Show a "limited data" banner. The scoreboard (basic stats) always works since those come from the Steam API layer. Only time-series and laning data require parsed replays.
**Warning signs:** Recharts throws errors on empty data arrays; lhT[10] throws on undefined arrays.

### Pitfall 3: BigInt Serialization in API Response
**What goes wrong:** The existing API route serializes `matchId` and `accountId` as strings. New fields with BigInt (if any) will fail JSON.stringify.
**Why it happens:** JavaScript JSON.stringify cannot serialize BigInt natively.
**How to avoid:** Already handled in the existing API route -- continue the pattern of `.toString()` for all BigInt fields.
**Warning signs:** "TypeError: Do not know how to serialize a BigInt" in API responses.

### Pitfall 4: Recharts v3 Render Order
**What goes wrong:** Tooltip renders behind chart lines or grid, making it unreadable.
**Why it happens:** Recharts v3 uses SVG document order for z-index. Elements later in JSX render on top.
**How to avoid:** Always place `<Tooltip>` after all `<Line>` elements in JSX. Place `<Legend>` last if used.
**Warning signs:** Tooltip text obscured by chart elements.

### Pitfall 5: Lane Value Interpretation
**What goes wrong:** Lane cards show wrong hero matchups because lane values are misinterpreted.
**Why it happens:** OpenDota `lane` field: 1 = bot, 2 = mid, 3 = top. `lane_role`: 1 = safe lane, 2 = mid, 3 = offlane, 4 = jungle. These are NOT the same mapping.
**How to avoid:** Use `lane` for physical lane position (which lane card to place the hero in). Use `lane_role` for role context. Use `is_roaming` to filter out roamers.
**Warning signs:** Carry showing in offlane card, or mid heroes appearing in wrong lane.

### Pitfall 6: CDN Image Paths Have Query Strings
**What goes wrong:** Hero/item image URLs from dotaconstants include trailing `?` or `?t=timestamp`. Some image components strip or double-encode these.
**Why it happens:** Valve CDN uses cache-busting query params.
**How to avoid:** Use the path as-is from dotaconstants. If using next/image with external domains, add `cdn.cloudflare.steamstatic.com` to `next.config` remotePatterns.
**Warning signs:** 403/404 on hero images, broken image placeholders.

## Code Examples

### Expanding API Response (GET route)
```typescript
// In src/app/api/matches/[matchId]/route.ts GET handler
// Add all Phase 2 fields to player serialization
players: match.status === "complete"
  ? match.players.map((p) => ({
      // Existing fields
      heroId: p.heroId,
      playerSlot: p.playerSlot,
      accountId: p.accountId?.toString() ?? null,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      goldPerMin: p.goldPerMin,
      xpPerMin: p.xpPerMin,
      lastHits: p.lastHits,
      denies: p.denies,
      heroDamage: p.heroDamage,
      towerDamage: p.towerDamage,
      heroHealing: p.heroHealing,
      items: p.items,
      // Phase 2 additions
      personaname: p.personaname,
      isRadiant: p.isRadiant,
      level: p.level,
      netWorth: p.netWorth,
      itemNeutral: p.itemNeutral,
      lane: p.lane,
      laneRole: p.laneRole,
      laneEfficiency: p.laneEfficiency,
      isRoaming: p.isRoaming,
      goldT: p.goldT,
      xpT: p.xpT,
      lhT: p.lhT,
      dnT: p.dnT,
      benchmarks: p.benchmarks,
      // Expand detail fields
      purchaseLog: p.purchaseLog,
      abilityUpgrades: p.abilityUpgrades,
      damage: p.damage,
      damageTaken: p.damageTaken,
      obsPlaced: p.obsPlaced,
      senPlaced: p.senPlaced,
      runesLog: p.runesLog,
    }))
  : [],
// Match-level Phase 2 fields
radiantScore: match.radiantScore,
direScore: match.direScore,
firstBloodTime: match.firstBloodTime,
lobbyType: match.lobbyType,
radiantGoldAdv: match.radiantGoldAdv,
radiantXpAdv: match.radiantXpAdv,
objectives: match.objectives,
```

### Next.js Config for CDN Images
```typescript
// next.config.ts -- add remotePatterns for Steam CDN
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
        pathname: "/apps/dota2/images/**",
      },
    ],
  },
};
```

### Transforming Advantage Data for Recharts
```typescript
// Convert radiantGoldAdv/radiantXpAdv arrays to Recharts data format
export function buildAdvantageData(
  goldAdv: number[] | null,
  xpAdv: number[] | null
): AdvantagePoint[] {
  const len = Math.max(goldAdv?.length ?? 0, xpAdv?.length ?? 0);
  if (len === 0) return [];
  return Array.from({ length: len }, (_, i) => ({
    minute: i,
    gold: goldAdv?.[i] ?? 0,
    xp: xpAdv?.[i] ?? 0,
  }));
}
```

### Lane Classification Helper
```typescript
// OpenDota lane values: 1=bot, 2=mid, 3=top
// Lane labels for display
export const LANE_LABELS: Record<number, string> = { 1: "Bot", 2: "Mid", 3: "Top" };

export function getLaneMatchups(players: PlayerData[]) {
  const lanes: Record<number, { radiant: PlayerData[]; dire: PlayerData[] }> = {
    1: { radiant: [], dire: [] },
    2: { radiant: [], dire: [] },
    3: { radiant: [], dire: [] },
  };

  for (const p of players) {
    if (p.isRoaming || !p.lane || p.lane < 1 || p.lane > 3) continue;
    const team = p.isRadiant ? "radiant" : "dire";
    lanes[p.lane][team].push(p);
  }

  return lanes;
}

export function getRoamingPlayers(players: PlayerData[]) {
  return players.filter((p) => p.isRoaming || !p.lane || p.lane < 1 || p.lane > 3);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts v2 Customized + CategoricalChartState | Recharts v3 render-order z-index, hooks-based state | Recharts 3.0 (2024) | Must not use old Customized patterns |
| cdn.dota2.com hero images | cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/ | ~2023 | New CDN path with dota_react subdirectory |
| Manual hero/item JSON files | dotaconstants npm package (auto-updated) | Ongoing | No manual maintenance needed |

**Deprecated/outdated:**
- `cdn.dota2.com` image paths: Valve migrated to `cdn.cloudflare.steamstatic.com`
- Recharts `alwaysShow` prop: Removed in v3
- Recharts `Customized` with full chart state: v3 no longer passes CategoricalChartState

## Open Questions

1. **dotaconstants item ID lookup performance**
   - What we know: Items are keyed by string name, not numeric ID. Need to iterate values to find by ID.
   - What's unclear: Whether there's a pre-built numeric index or if we must build one.
   - Recommendation: Build a `Record<number, ItemInfo>` at module initialization. O(n) once, O(1) thereafter.

2. **Graph color palette for 10 player lines**
   - What we know: Need 10 distinguishable colors, 5 per team. Teams are Radiant (green tones) and Dire (red tones).
   - What's unclear: Exact hex values that work on dark background.
   - Recommendation: Use 5 shades of green/teal for Radiant, 5 shades of red/orange for Dire. Test contrast against --card-bg (#111118).

3. **Cluster ID to region name mapping**
   - What we know: dotaconstants has region.json. Match model stores cluster (int).
   - What's unclear: Whether cluster maps directly to region ID or needs transformation.
   - Recommendation: OpenDota maps cluster to region via `Math.floor(cluster / 1000)` or similar. Verify with sample data during implementation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/unit --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MATC-01 | API returns all player stats + match metadata | unit | `npx vitest run tests/unit/test-match-api.test.ts -x` | No -- Wave 0 |
| MATC-01 | Dota constants lookup returns hero/item data | unit | `npx vitest run tests/unit/test-dota-constants.test.ts -x` | No -- Wave 0 |
| MATC-02 | Lane classification groups players correctly | unit | `npx vitest run tests/unit/test-match-utils.test.ts -x` | No -- Wave 0 |
| MATC-02 | CS@10 extraction handles null/short arrays | unit | `npx vitest run tests/unit/test-match-utils.test.ts -x` | No -- Wave 0 |
| MATC-03 | Advantage data transform produces Recharts-compatible format | unit | `npx vitest run tests/unit/test-match-utils.test.ts -x` | No -- Wave 0 |
| MATC-03 | Empty goldT/xpT arrays handled gracefully | unit | `npx vitest run tests/unit/test-match-utils.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/unit --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test-dota-constants.test.ts` -- covers hero/item lookup correctness
- [ ] `tests/unit/test-match-utils.test.ts` -- covers lane classification, CS@10, data transforms
- [ ] `tests/unit/test-match-api.test.ts` -- covers expanded API response serialization

## Sources

### Primary (HIGH confidence)
- Project codebase: Prisma schema, worker, API route, existing components -- all Phase 2 fields already modeled and stored
- OpenDota API `/api/constants/heroes` -- verified hero data structure: `{ id, name, localized_name, img, icon }`
- OpenDota API `/api/constants/items` -- verified item data structure: `{ id, dname, img, cost }`
- [Recharts GitHub releases](https://github.com/recharts/recharts/releases) -- v3.8.0 latest
- [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) -- breaking changes documented

### Secondary (MEDIUM confidence)
- [dotaconstants GitHub](https://github.com/odota/dotaconstants) -- package structure with build/ directory for JSON imports
- [OpenDota docs](https://docs.opendota.com/) -- API endpoint documentation
- CDN image paths: `cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/{name}.png`

### Tertiary (LOW confidence)
- Lane value mapping (1=bot, 2=mid, 3=top) -- inferred from community sources and OpenDota codebase, not officially documented. Verify with sample match data.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Recharts is user-locked, dotaconstants is the de facto standard, both well-documented
- Architecture: HIGH -- clear component decomposition, all data already available in DB
- Pitfalls: HIGH -- verified against actual API responses and Recharts v3 migration guide

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable domain, Dota constants may update with patches but structure is stable)
