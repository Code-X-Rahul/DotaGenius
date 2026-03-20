# DotaGenius Specification

## 1. Replay Pipeline
- Step 1: Download `.dem` file from Steam via MatchID.
- Step 2: Extract hero positions (X, Y) and combat logs (damage, kills).
- Step 3: Convert binary data to a queryable JSON/Postgres format.

## 2. AI Analytical Insights
- Rotation Analysis: Detect if a support stayed in lane too long when a gank was happening mid.
- Itemization Audit: Compare player build against "Meta" builds for that specific hero matchup.

## 3. Frontend Visualization
- Mini-map Heatmap: SVG overlay showing "Death Density" for the user.
- Timeline Slider: Scrub through game time to see net worth spikes.

## 4. Hardware Optimization
- Correlate FPS/Latency logs (if provided by user) with team fight intensity to identify PC bottlenecks.