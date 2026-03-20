# Pitfalls Research

**Domain:** Dota 2 replay analysis tool
**Researched:** 2026-03-20
**Confidence:** HIGH (based on OpenDota post-mortems, Valve API documentation, and community parser projects)

## Critical Pitfalls

### Pitfall 1: Replay Download URL No Longer Available via Steam Web API

**What goes wrong:**
Developers assume they can call `GetMatchDetails` to get a `replay_salt`, construct a download URL (`http://replayCLUSTER.valve.net/570/MATCHID_REPLAYSALT.dem.bz2`), and download the replay. Valve removed `replay_salt` from the API response due to privacy concerns. The `GetMatchDetails` endpoint itself has also experienced extended outages (notably after patch 7.36, returning empty arrays or 500 errors).

**Why it happens:**
Outdated tutorials and documentation still reference the old workflow. Developers build the pipeline assuming the Web API is sufficient, then discover at integration time that the critical field is missing.

**How to avoid:**
Use the Dota 2 Game Coordinator (GC) protocol to fetch replay salts. This requires:
- A dedicated Steam alt account (cannot be logged into Steam client simultaneously)
- Steam Guard must be disabled on the account
- Use `node-dota2` (Node.js) or `go-dota2` (Go) to communicate with the GC
- OpenDota's approach: maintain multiple Steam accounts to work around GC rate limits

Alternatively, use the OpenDota API's `/replays` endpoint to get replay URLs for parsed matches, avoiding the GC entirely for matches OpenDota has already processed.

**Warning signs:**
- `replay_salt` field missing from `GetMatchDetails` response
- 500 errors or empty arrays from `GetMatchDetails` after a Dota patch
- Tutorials referencing replay download URLs that no longer work

**Phase to address:**
Phase 1 (Replay Pipeline). This is the foundation of the entire product. If replay download does not work, nothing else matters. Validate the GC approach in a spike before building anything else.

---

### Pitfall 2: Replay Expiry Window is Only ~10 Days

**What goes wrong:**
Users enter a Match ID from a game played two weeks ago, the tool attempts to download the replay, and it no longer exists. The developer either does not handle this gracefully or does not communicate the limitation, leading to user frustration and the perception that the tool is broken.

**Why it happens:**
Valve only stores replay files on their CDN for approximately 10 days (some sources say up to 14 days, but 10 is the safe assumption). This is not prominently documented. Developers often discover it late in development when testing with older matches.

**How to avoid:**
- Display the expiry window prominently in the UI before the user submits a Match ID
- Validate match age before attempting download (use `GetMatchDetails` `start_time` field)
- Return a clear error message: "This replay has expired. Replays are only available for ~10 days after the match."
- Consider caching parsed replay data so users can revisit analysis of previously parsed matches even after the replay expires

**Warning signs:**
- 404 errors when downloading replays for matches older than 10 days
- User complaints about "broken" functionality on matches that are actually expired

**Phase to address:**
Phase 1 (Replay Pipeline). Build expiry validation into the download step from day one.

---

### Pitfall 3: Protobuf Schema Breaks After Every Major Dota Patch

**What goes wrong:**
Valve updates Dota 2 (new heroes, new items, gameplay changes), and the protobuf schema in .dem files changes. Fields are added, removed, or renamed. The parser suddenly produces corrupted data, missing fields, or crashes entirely. This can happen with any major patch (roughly every few months).

**Why it happens:**
Valve does not publish or version the replay protobuf schema. Parser libraries like Clarity reverse-engineer it. After a patch, there is a lag (hours to weeks) before parser libraries update their protobuf definitions to match.

**How to avoid:**
- Use Clarity (Java, actively maintained by skadistats) as the parser -- it has the fastest update cycle after patches and is used by both OpenDota and Dotabuff
- Pin parser versions and test against replays from the current patch before deploying updates
- Build a "parser health check" that validates parsed output against known-good data
- Design the system to degrade gracefully: if parsing fails, show match metadata from the API while flagging that full analysis is temporarily unavailable
- Monitor the Clarity GitHub repository for updates after each Dota patch

**Warning signs:**
- Parser produces null/zero values for fields that should have data
- New hero or item IDs appear that are not in your mapping tables
- Parse errors spike after a Dota patch

**Phase to address:**
Phase 1 (Replay Pipeline). The parser integration must include version management and a post-patch validation workflow. This is an ongoing operational concern.

---

### Pitfall 4: Replay Parsing is CPU-Intensive and Blocks the Server

**What goes wrong:**
A developer parses .dem files synchronously on the web server. A single replay (20-40 MB compressed, larger uncompressed) takes significant CPU time to parse. With even a few concurrent users, the server becomes unresponsive. The web UI freezes or times out.

**Why it happens:**
Parsing a protobuf replay file involves decompressing bz2, deserializing thousands of game state snapshots, and extracting entity data. OpenDota reports processing ~1.1 million matches per day requires significant infrastructure. A single replay parse can take 10-60 seconds depending on game length and parser efficiency.

**How to avoid:**
- Run parsing in a separate background worker process, not on the web server
- Use a job queue (BullMQ with Redis, or similar) to manage parse requests
- Return a "processing" status to the user immediately and notify/poll when complete
- If using Clarity (Java), run it as a separate microservice or CLI subprocess
- Consider the OpenDota parser (Go-based, outputs JSON) as an alternative that can run as a subprocess

**Warning signs:**
- Web server CPU spikes to 100% during parse requests
- HTTP request timeouts during parsing
- Users see blank pages or loading spinners for 30+ seconds

**Phase to address:**
Phase 1 (Replay Pipeline). Architecture decision: separate worker from web server from the start. Retrofitting async parsing later requires significant refactoring.

---

### Pitfall 5: LLM Hallucinations in Game Analysis

**What goes wrong:**
The LLM generates plausible-sounding but factually wrong analysis. Examples: recommending items that do not exist in the current patch, citing game mechanics that were changed years ago, fabricating statistics about hero win rates, or misattributing events (saying the carry died at 15:00 when it was the support).

**Why it happens:**
LLMs do not have real-time Dota 2 knowledge. Their training data contains outdated patch information. When given ambiguous or incomplete parsed data, they fill gaps with hallucinated details. Dota 2's complexity (130+ heroes, hundreds of items, frequent balance patches) makes this especially dangerous because wrong advice sounds authoritative.

**How to avoid:**
- Hybrid approach (already planned): use deterministic rules for factual claims, LLM only for natural-language explanation of those facts
- Never let the LLM generate statistics, item names, or game events -- feed those as structured data in the prompt
- Validate LLM output against the parsed replay data before displaying (e.g., if LLM mentions a hero not in the match, flag it)
- Include current patch item/hero data in the LLM context (RAG approach)
- Use constrained prompts: "Based ONLY on the following combat log data, explain..."
- Display the underlying data alongside the LLM explanation so users can verify

**Warning signs:**
- LLM mentions heroes, items, or abilities not present in the parsed data
- Analysis contradicts the combat log timeline
- Users report advice that does not match current patch mechanics

**Phase to address:**
Phase 3 (AI Analysis). But the data contract between parser output and AI input must be designed in Phase 1. The hybrid architecture decision is critical.

---

### Pitfall 6: Scraping Dotabuff Will Get You Blocked

**What goes wrong:**
The developer builds a scraper for Dotabuff hero builds, win rates, and meta data. It works in development. In production, Dotabuff's anti-bot systems detect the scraping pattern and block the IP. The meta data source goes dark, and the AI analysis loses its comparison baseline.

**Why it happens:**
Dotabuff is a commercial product that does not offer a public API. It uses sophisticated bot detection (IP reputation, browser fingerprinting, behavioral analysis, rate limiting). Scraping violates their Terms of Service and is legally risky.

**How to avoid:**
- Use the OpenDota API instead. It provides hero statistics, win rates, popular items, and meta data via a legitimate API (50,000 free calls/month, 60 requests/minute)
- For richer meta data, use OpenDota's `/heroStats`, `/heroes/{id}/matchups`, and `/heroes/{id}/itemPopularity` endpoints
- If OpenDota data is insufficient, consider Stratz API (GraphQL-based, has a free tier)
- Cache meta data aggressively -- hero build popularity does not change minute-to-minute; daily or weekly refreshes are sufficient
- Only fall back to scraping as an absolute last resort, and if you do, respect robots.txt and rate limit to 1 request every 5+ seconds

**Warning signs:**
- 429 (Too Many Requests) responses from Dotabuff
- CAPTCHAs appearing in scraped responses
- Scraped HTML structure changes breaking your selectors (Dotabuff can change this at any time)

**Phase to address:**
Phase 2 (Meta Data Sourcing). Switch from planned Dotabuff scraping to OpenDota API. This is a project-level decision that should be made before implementation begins.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcoding hero/item IDs | Faster initial development | Breaks every patch when heroes/items are added or reworked | Never -- use OpenDota's `/constants` endpoint or Valve's VPK game files |
| Storing raw replay files | Can re-parse with updated parser | Disk usage explodes (30MB x matches adds up fast) | Only for development/debugging; parse-and-discard in production |
| Synchronous LLM calls | Simpler code path | Blocks response for 5-15 seconds per analysis; poor UX at scale | MVP only, with clear plan to make async |
| Single Steam GC account | Simpler setup | Rate limited to ~100 requests/hour; single point of failure | MVP only; plan for account pool |
| Skipping replay decompression error handling | Faster happy-path development | Corrupted downloads silently produce garbage data | Never -- always validate decompressed file integrity |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Steam Web API | Treating it as reliable (it is not -- random 500s, empty responses, rate limits of ~5-6 calls/sec) | Implement retry with exponential backoff, circuit breaker pattern, and fallback to OpenDota API for match metadata |
| Dota 2 Game Coordinator | Using your main Steam account | Use a dedicated alt account with Steam Guard disabled; plan for the account being unable to log into Steam client simultaneously |
| OpenDota API | Not requesting API key, hitting 50k/month free tier limit | Register for an API key immediately; implement request caching to minimize API calls |
| Clarity Parser | Assuming it handles all edge cases (turbo mode, custom lobbies, bot matches) | Validate parser output for each match mode; some modes produce incomplete data; filter unsupported modes early |
| LLM API (OpenAI/Anthropic) | Sending raw replay data to the LLM | Pre-process into structured summaries; send only relevant combat log entries, not the entire game state |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| SVG-based heatmap with thousands of data points | Browser freezes, janky scrolling, high memory usage | Use Canvas or WebGL for heatmap rendering; SVG handles ~1,000 points max at 60fps | > 1,000 position data points per heatmap |
| Loading entire parsed replay into browser memory | Tab crashes, mobile devices unusable | Stream data to frontend in chunks; pre-aggregate server-side (e.g., position data into grid cells) | Replays with 45+ minute games producing 50k+ position records |
| Timeline slider re-rendering full visualization on every tick | Stuttering, dropped frames | Debounce slider input; pre-compute keyframe data; use requestAnimationFrame | Any game length when user drags slider continuously |
| Unindexed database queries on match history | Slow page loads, database CPU spikes | Index on match_id, player account_id, start_time; use materialized views for aggregations | > 10,000 parsed matches stored |
| Parsing replays on every request instead of caching results | Server overload, redundant CPU usage | Parse once, store structured results in database; serve from cache on subsequent requests | > 5 concurrent parse requests |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Steam API key in frontend code | Key theft, API abuse under your quota | Keep Steam API key server-side only; never include in client bundles |
| Storing Steam GC account credentials in code/config files committed to git | Account compromise, potential Steam ban | Use environment variables or secrets manager; add credential files to .gitignore |
| Accepting arbitrary file paths from user input for replay processing | Path traversal, arbitrary file read | Validate Match IDs as numeric only; construct file paths server-side with sanitized inputs |
| No rate limiting on the analysis endpoint | Resource exhaustion, denial of service | Rate limit by IP (e.g., 10 analyses per hour per IP for anonymous users) |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indicator during replay parsing (10-60 sec) | User thinks the app is broken, refreshes, triggers duplicate parse | Show a progress bar or status updates ("Downloading replay... Parsing combat log... Analyzing rotations...") |
| Showing raw data without context | User sees numbers but does not understand what they mean | Every metric needs a comparison baseline ("Your GPM was 450. Average for this hero at your rank: 520.") |
| Assuming users know Dota terminology | Casual players confused by terms like "rotation timing" or "power spike" | Provide tooltips or expandable explanations for analysis terms |
| Displaying analysis for all 10 players equally | Information overload; user only cares about their own hero | Default to the user's hero perspective; allow expanding to see teammates/opponents |
| Not handling expired replays gracefully | User enters old Match ID, gets cryptic error | Show clear message with the expiry window; offer to show available API-only data (KDA, items, duration) even without replay |

## "Looks Done But Isn't" Checklist

- [ ] **Replay Download:** Often missing retry logic for CDN failures -- verify downloads succeed with bz2 integrity check after decompression
- [ ] **Combat Log Parsing:** Often missing illusion/summon events -- verify that Meepo clones, Phantom Lancer illusions, and summoned units are handled correctly
- [ ] **Heatmap:** Often missing coordinate system mapping -- verify that game-world coordinates are correctly mapped to minimap pixel positions (Dota 2 map coordinates are not 0-1 normalized)
- [ ] **Item Build Analysis:** Often missing backpack/neutral item slots -- verify that all 9 item slots (6 inventory + 3 backpack) plus neutral item are captured
- [ ] **Timeline:** Often missing Roshan kills, Aegis pickups, and building destruction events -- verify all major game events appear on the timeline
- [ ] **AI Analysis:** Often missing patch-awareness -- verify that the LLM context includes current patch number and that item/ability recommendations are valid for the current patch
- [ ] **Match Metadata:** Often missing ranked/unranked distinction and game mode -- verify turbo, ability draft, and other modes are handled or explicitly excluded

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Replay download method breaks (Valve API change) | MEDIUM | Switch to OpenDota `/replays` endpoint as fallback; implement GC-based download as primary |
| Parser breaks after Dota patch | LOW | Pin Clarity version; monitor GitHub for updates; revert to last working version while waiting for fix |
| Dotabuff scraper gets blocked | LOW | Switch to OpenDota API (should have been the plan from the start) |
| LLM produces hallucinated analysis | MEDIUM | Add output validation layer; constrain prompts further; fall back to rule-based-only analysis if LLM output fails validation |
| Database schema cannot handle new Dota mechanic | HIGH | Requires migration; prevent by designing flexible schema with JSONB columns for evolving game data |
| Frontend performance degrades with large replays | MEDIUM | Switch from SVG to Canvas/WebGL rendering; implement server-side aggregation; add pagination |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Replay download via GC (not Web API) | Phase 1: Replay Pipeline | Successfully download and decompress a replay from a match played today |
| Replay expiry handling | Phase 1: Replay Pipeline | Graceful error when attempting to analyze a match older than 14 days |
| Parser version management | Phase 1: Replay Pipeline | Parse a replay from the current Dota patch without errors; document the update workflow |
| Async parsing architecture | Phase 1: Replay Pipeline | Web server remains responsive while parsing a replay in the background |
| Dotabuff scraping replaced with OpenDota API | Phase 2: Meta Data | Successfully retrieve hero builds and win rates from OpenDota API |
| LLM hallucination prevention | Phase 3: AI Analysis | AI output references only heroes, items, and events present in the parsed data |
| Frontend rendering performance | Phase 4: Visualization | Heatmap with 5,000+ data points renders at 60fps; timeline slider is smooth |
| Protobuf schema updates after patches | Ongoing Operations | Documented runbook for updating parser after a Dota patch |

## Sources

- [OpenDota: Lessons Learned From Parsing 10 Million Replays](https://blog.opendota.com/2016/05/13/learnings/) -- primary source for infrastructure and scaling pitfalls
- [OpenDota FAQ](https://blog.opendota.com/2014/08/01/faq/) -- replay expiry, GC requirements
- [Clarity Parser (skadistats)](https://github.com/skadistats/clarity) -- parser capabilities and protobuf versioning
- [Manta Parser (dotabuff)](https://github.com/dotabuff/manta) -- Go-based alternative parser
- [OpenDota Parser](https://github.com/odota/parser) -- Go-based JSON output parser
- [node-dota2](https://github.com/Arcana/node-dota2) -- Game Coordinator integration
- [OpenDota Core](https://github.com/odota/core) -- reference architecture for replay pipeline
- [GetMatchDetails API issues (Valve GitHub)](https://github.com/ValveSoftware/Dota2-Gameplay/issues/17910) -- API reliability problems
- [OpenDota API Documentation](https://docs.opendota.com/) -- rate limits, available endpoints
- [Anatomy of a Dota 2 Replay File (skadistats)](https://github.com/skadistats/smoke/wiki/Anatomy-of-a-Dota-2-Replay-File) -- .dem file structure
- [Rendering One Million Datapoints with D3 and WebGL](https://blog.scottlogic.com/2020/05/01/rendering-one-million-points-with-d3.html) -- SVG vs Canvas vs WebGL performance

---
*Pitfalls research for: Dota 2 replay analysis tool (DotaGenius)*
*Researched: 2026-03-20*
