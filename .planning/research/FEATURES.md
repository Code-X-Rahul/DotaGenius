# Feature Research

**Domain:** Dota 2 Replay Analysis / AI Coaching
**Researched:** 2026-03-20
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Match lookup by Match ID | Every competitor (Dotabuff, OpenDota, STRATZ) does this. Users won't tolerate not being able to find their match. | LOW | Use Valve Steam Web API to fetch match metadata; this is the entry point for everything. |
| Basic match summary (KDA, GPM, XPM, items, hero) | OpenDota/Dotabuff/STRATZ all show this for free. Users compare tools by glancing at match overview first. | LOW | Pull from Valve API or parsed replay. Most of this data is available without full replay parsing. |
| Replay download and parsing pipeline | Core infrastructure. Without parsing the .dem file, there is no replay analysis -- just API stats (which OpenDota already provides for free). | HIGH | CPU-intensive. Requires a reliable parser (Clarity/Java or Manta/Go). Replays expire after ~2 weeks from Valve servers. |
| Hero build timeline (items + skills over time) | Dotabuff, STRATZ, and OpenDota all display item/skill progression. Users expect to see what was built and when. | MEDIUM | Extractable from replay combat log and entity snapshots. |
| Laning phase breakdown | OpenDota shows lane assignments, CS at 10 min, lane outcome. STRATZ shows laning matchup results. Fundamental to understanding a match. | MEDIUM | Requires parsing hero positions in first 10 minutes + last hit/deny counts from combat log. |
| Gold/XP graphs over time | Every major platform shows net worth and experience curves. Players use these to identify power spikes and momentum shifts. | MEDIUM | Needs periodic entity snapshots during replay parse (e.g., every 30 seconds). |
| Ward placement map | Dotabuff TrueSight and OpenDota both show ward locations. Support players especially rely on this. | MEDIUM | Ward events are in the combat log. Rendering on a minimap SVG is straightforward. |
| Death log / kill feed | Players want to understand who killed whom and with what abilities. Basic combat log display. | LOW-MEDIUM | Directly from combat log data. Needs clean UI to be useful. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable. These align with DotaGenius's core value: "clear, actionable insights about gameplay."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI rotation analysis | No existing tool tells you "your support should have rotated mid at 6:30 because the enemy mid was at 40% HP with no TP." This is DotaGenius's killer feature. Turns position data into coaching advice. | HIGH | Requires hero position tracking + game state awareness (HP, mana, TP status, nearby allies). Rule-based detection with LLM explanation layer. |
| AI itemization audit | Dotabuff shows what pros build, but nobody tells you "BKB was 8 minutes late given their lineup has 4 disables." Compare actual build vs optimal build for the specific matchup. | HIGH | Needs meta build data (scraped from Dotabuff/OpenDota) + matchup context (enemy hero abilities). Hybrid rules + LLM. |
| Death density heatmap with context | OpenDota shows ward maps; nobody shows "you died 4 times in the enemy triangle because you were farming without vision." Heatmap + WHY explanation. | MEDIUM | Position data from replay + death events. The "context" layer (explaining why) is the differentiator over raw heatmaps. |
| Interactive timeline slider with event annotations | STRATZ has a playback tool, but DotaGenius can annotate the timeline: "Net worth spike here because of Roshan kill" or "Power trough -- enemy team had Aegis advantage." Makes the timeline educational. | MEDIUM-HIGH | Needs event detection engine (Roshan, teamfight outcomes, tower kills) to auto-annotate. Timeline scrubbing itself is standard; annotations are the differentiator. |
| Natural language match summary | "You lost this game because your team gave up 3 unanswered kills between minutes 25-30, which let the enemy carry finish BKB and take Roshan." No existing tool generates a narrative summary. | MEDIUM | LLM-powered. Feed structured match data (events, timings, outcomes) as context. Relatively cheap to implement once data pipeline exists. |
| Personalized improvement focus | WebAtlas tries this ("one focus for your next game") but it is waitlisted and early. Telling a player "your biggest pattern across 5 games is dying in the first 2 minutes of teamfights" is powerful coaching. | HIGH | Requires storing analysis across multiple matches. Cross-match pattern detection. Defer to v2 unless single-match version is viable. |
| Teamfight breakdown with contribution scores | OpenDota shows basic teamfight data. DotaGenius can score each player's contribution: "You dealt 45% of team damage but used zero items." Actionable for understanding fight participation. | MEDIUM-HIGH | Parse combat log for damage/healing/item usage within teamfight time windows. Scoring algorithm needs tuning. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time in-game overlay / coaching | Players want advice during the match. KeenPlay and DotaCoach try this. | Massive technical complexity (game state integration via GSI), legal gray area with Valve ToS, latency-sensitive, completely different architecture from replay analysis. Two different products. | Focus on post-match analysis. Real-time is a separate product for v3+ if ever. |
| Steam account linking with auto-match-pull | Convenient -- no manual Match ID entry. | Adds OAuth complexity, privacy concerns, and scope creep. Dotabuff/OpenDota already do this well. DotaGenius's value is in analysis depth, not match discovery. | v1 uses manual Match ID entry. Add Steam linking in v2 after core analysis is validated. |
| MMR tracking / rank progression | Players love seeing their rank go up. | Valve restricted public MMR data. Existing tools (Dotabuff, STRATZ) already do this with years of data. DotaGenius cannot compete on historical data depth. | Show match-level performance metrics instead. Let users track improvement through analysis quality, not MMR graphs. |
| Social features (friends, sharing, leaderboards) | Community drives retention. | Enormous scope creep. Every social feature needs moderation, accounts, notifications. Completely orthogonal to analysis quality. | Simple share-via-URL for a match analysis. No accounts needed in v1. |
| Full match replay viewer (video playback) | Players want to watch the game back. | Dota 2 client already does this better than any web tool ever could. Rendering a full 3D replay is absurd scope. STRATZ's "playback" is a simplified 2D timeline, not actual replay. | Provide the minimap-level 2D playback (hero dots on map) with stat overlays. Link to "watch in client" for full replay. |
| Pro player build recommendations | "What would Arteezy build here?" | Dotabuff and Dota2ProTracker already dominate this space with massive datasets. Building a worse version adds no value. | Use pro build data as the baseline for itemization audits. Reference it, don't try to be the source of truth. |
| Multi-language support | Dota has a global player base. | Internationalization is expensive and LLM outputs need per-language prompt engineering. Premature for v1. | English only for v1. Evaluate demand after launch. |

## Feature Dependencies

```
[Replay Pipeline (download + parse .dem)]
    |
    +--requires--> [Valve Steam Web API integration]
    |
    +--produces--> [Combat Log Data]
    |                  |
    |                  +--feeds--> [Death Log / Kill Feed]
    |                  +--feeds--> [Ward Placement Map]
    |                  +--feeds--> [Teamfight Breakdown]
    |                  +--feeds--> [AI Rotation Analysis]
    |
    +--produces--> [Hero Position Data (entity snapshots)]
    |                  |
    |                  +--feeds--> [Death Density Heatmap]
    |                  +--feeds--> [AI Rotation Analysis]
    |                  +--feeds--> [Laning Phase Breakdown]
    |                  +--feeds--> [Timeline Slider]
    |
    +--produces--> [Gold/XP Snapshots]
                       |
                       +--feeds--> [Gold/XP Graphs]
                       +--feeds--> [Timeline Slider]
                       +--feeds--> [Natural Language Summary]

[Meta Data Scraping (Dotabuff/OpenDota)]
    |
    +--feeds--> [AI Itemization Audit]

[AI Rotation Analysis] + [AI Itemization Audit] + [Death Heatmap]
    |
    +--feeds--> [Natural Language Match Summary]

[Natural Language Match Summary] (single match)
    |
    +--feeds--> [Personalized Improvement Focus] (cross-match, v2)
```

### Dependency Notes

- **Everything requires Replay Pipeline:** The replay download + parse pipeline is the foundation. Without it, DotaGenius is just another API wrapper around OpenDota's data.
- **AI features require both Combat Log and Position Data:** Rotation analysis needs to know where heroes were AND what was happening (fights, ganks, deaths). These are separate data streams from the parser.
- **AI Itemization Audit requires Meta Data:** Cannot compare a player's build to "optimal" without knowing what the meta build is. This means the Dotabuff/OpenDota scraping pipeline must exist before itemization analysis works.
- **Timeline Slider enhances everything:** The timeline is a presentation layer that ties together gold graphs, events, and position data. It benefits from having all data sources available but can launch with partial data.
- **Natural Language Summary depends on AI analysis outputs:** The LLM summary consumes the structured findings from rotation analysis, itemization audit, and event detection. It should be the last feature built in a phase.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate that AI-powered replay analysis is worth building.

- [ ] **Replay pipeline** (download .dem via Match ID, parse with Clarity/Manta) -- without this, there is no product
- [ ] **Basic match summary** (KDA, items, hero, duration, outcome) -- gives users immediate feedback that the system works
- [ ] **Laning phase breakdown** (lane assignments, CS at 10 min) -- simple, high-value, every player cares about laning
- [ ] **Gold/XP graphs over time** -- visual, easy to understand, shows the story of the match
- [ ] **Death density heatmap** (SVG minimap overlay) -- visually impressive, demonstrates unique value from replay parsing
- [ ] **AI rotation analysis** (1 key differentiator) -- this is the hook. Even a basic version ("your support was in lane during a kill opportunity mid") validates the concept
- [ ] **Natural language match summary** -- ties everything together with an LLM-generated paragraph explaining what happened

### Add After Validation (v1.x)

Features to add once core replay parsing and AI analysis are proven.

- [ ] **AI itemization audit** -- requires meta data scraping pipeline; add once rotation analysis is validated
- [ ] **Ward placement map** -- straightforward from combat log, adds support-player value
- [ ] **Interactive timeline slider with annotations** -- enriches the presentation layer significantly
- [ ] **Teamfight breakdown with contribution scores** -- deeper combat log analysis
- [ ] **Death log / kill feed** -- useful but lower priority than AI insights

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Steam account linking / auto-match-pull** -- convenience feature, not core value
- [ ] **Personalized improvement focus (cross-match patterns)** -- requires match history storage, user accounts
- [ ] **2D minimap playback** (hero dots moving on map) -- impressive but high complexity for the rendering layer
- [ ] **Batch analysis** (analyze all 10 recent matches at once) -- infrastructure scaling concern
- [ ] **Mobile-responsive design** -- web-first, optimize for desktop where players actually review replays

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Replay pipeline (download + parse) | HIGH | HIGH | P1 |
| Basic match summary | HIGH | LOW | P1 |
| Laning phase breakdown | HIGH | MEDIUM | P1 |
| Gold/XP graphs | MEDIUM | MEDIUM | P1 |
| Death density heatmap | HIGH | MEDIUM | P1 |
| AI rotation analysis | HIGH | HIGH | P1 |
| Natural language match summary | HIGH | MEDIUM | P1 |
| AI itemization audit | HIGH | HIGH | P2 |
| Ward placement map | MEDIUM | MEDIUM | P2 |
| Timeline slider with annotations | MEDIUM | MEDIUM-HIGH | P2 |
| Teamfight breakdown | MEDIUM | MEDIUM | P2 |
| Death log / kill feed | LOW-MEDIUM | LOW | P2 |
| Steam account linking | MEDIUM | MEDIUM | P3 |
| Cross-match pattern detection | HIGH | HIGH | P3 |
| 2D minimap playback | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch -- validates the core concept
- P2: Should have, add after v1 launch proves value
- P3: Nice to have, future consideration after product-market fit

## Competitor Feature Analysis

| Feature | Dotabuff | OpenDota | STRATZ | DotaGenius (Our Approach) |
|---------|----------|----------|--------|--------------------------|
| Match lookup | Yes (Steam-linked) | Yes (Steam-linked + Match ID) | Yes (Steam-linked) | Match ID only (v1), simpler |
| Basic stats (KDA, items) | Yes, polished | Yes, free | Yes, with IMP scoring | Yes, but stats are not the differentiator |
| Replay parsing | Yes (TrueSight, paid) | Yes (free, open source) | No (uses API data) | Yes, required for AI features |
| Ward map | TrueSight (paid) | Yes (free) | Basic | Yes, with contextual explanations |
| Laning breakdown | Basic | Yes | Yes | Yes, with AI commentary |
| Gold/XP graphs | Yes | Yes | Yes | Yes, annotated with events |
| Heatmaps | No | No | No | **Yes -- death density with context (differentiator)** |
| AI rotation analysis | No | No | No | **Yes -- core differentiator** |
| AI itemization audit | No | No | No | **Yes -- core differentiator** |
| Natural language summary | No | No | No | **Yes -- core differentiator** |
| Match playback (2D) | No | No | Yes (simplified) | Deferred to v2 |
| Draft analysis / prediction | No | No | Yes (STRATZ+) | Out of scope -- draft analysis is a different product |
| Pro build tracking | Yes (dominant) | Yes | Yes | No -- use their data as input, not as a competing feature |
| API access | Limited | Yes (free, open) | Yes (GraphQL) | No public API in v1 |
| Pricing | Free + Plus ($6/mo) | Free (donate-supported) | Free + Plus | TBD -- freemium likely; AI analysis costs money to run |

### Key Competitive Insight

Dotabuff, OpenDota, and STRATZ are **data platforms**. They show you numbers and let you draw conclusions. DotaGenius is a **coaching tool**. It draws the conclusions for you. This is a fundamentally different value proposition and means DotaGenius does not need to compete on data breadth -- it competes on insight quality.

The biggest risk is that WebAtlas (AI coaching via OpenDota data) or similar tools launch and capture this niche before DotaGenius. However, WebAtlas relies on OpenDota API data only (no replay parsing), which limits the depth of analysis possible. DotaGenius's replay parsing gives access to position data, combat log details, and entity states that API-only tools cannot match.

## Sources

- [Dotabuff](https://www.dotabuff.com/) -- leading Dota 2 stats platform, Plus subscription for TrueSight replay analysis
- [Dotabuff Plus](https://www.dotabuff.com/plus) -- premium features including TrueSight ward/vision analysis
- [OpenDota](https://www.opendota.com/) -- open source Dota 2 data platform with free replay parsing
- [OpenDota GitHub](https://github.com/odota/core) -- open source replay parsing infrastructure
- [STRATZ](https://stratz.com/) -- Dota 2 stats with playback tool and GraphQL API
- [STRATZ Review](https://dota2gamers.gg/stratz-review/) -- feature overview including IMP scoring and draft tools
- [WebAtlas](https://webatlas.online/) -- AI coaching platform using OpenDota data
- [Clarity Parser](https://github.com/skadistats/clarity) -- Java-based Dota 2 replay parser
- [Manta Parser](https://github.com/dotabuff/manta) -- Go-based Dota 2 replay parser by Dotabuff
- [OpenDota Blog: Parsing Learnings](https://blog.opendota.com/2016/05/13/learnings/) -- lessons from parsing millions of replays
- [Dota2Freaks OpenDota Guide](https://dota2freaks.com/opendota/) -- detailed OpenDota feature walkthrough

---
*Feature research for: Dota 2 Replay Analysis / AI Coaching*
*Researched: 2026-03-20*
