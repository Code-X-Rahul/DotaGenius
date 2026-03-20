#!/usr/bin/env npx tsx

/**
 * Steam GC Spike Script
 *
 * Proof-of-concept to validate replay_salt retrieval from the Dota 2 Game Coordinator.
 * Validates whether the GC fallback is viable for replay acquisition.
 *
 * Usage:
 *   npx tsx scripts/gc-spike.ts <matchId>
 *   npx tsx scripts/gc-spike.ts               # uses a default known match ID
 *
 * Prerequisites:
 *   - STEAM_USERNAME and STEAM_PASSWORD set in .env or environment
 *   - See docs/steam-bot-setup.md for Steam bot account setup
 */

import { getReplaySalt, buildReplayUrl } from "../src/lib/steam-gc";

// Load .env if available (best-effort, no hard dependency)
const loadENV = async () => {
  try {
    const { config } = await import("dotenv");
    config();
  } catch {
    // dotenv not installed; rely on environment variables
  }
};
loadENV();

// A well-known public match ID as fallback for testing
const DEFAULT_MATCH_ID = "8145498311";

async function main() {
  const matchId = process.argv[2] || DEFAULT_MATCH_ID;

  console.log("=== Steam GC Spike ===");
  console.log(`Match ID: ${matchId}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();

  // Step 1: Retrieve replay salt from GC
  console.log("[1/3] Requesting match details from Dota 2 Game Coordinator...");

  let cluster: number;
  let replaySalt: number;

  try {
    const result = await getReplaySalt(matchId);

    if (!result) {
      console.error(
        "\nGC RESULT: FAILED - Match not found or replay unavailable",
      );
      console.error(
        "Recommendation: Ship with OpenDota-only mode. " +
          "The Steam GC fallback is not viable for this match.",
      );
      process.exit(1);
    }

    cluster = result.cluster;
    replaySalt = result.replaySalt;

    console.log(`  cluster:     ${cluster}`);
    console.log(`  replaySalt:  ${replaySalt}`);
    console.log();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nGC RESULT: ERROR - ${message}`);
    console.error();

    if (message.includes("STEAM_USERNAME")) {
      console.error(
        "Setup required: Set STEAM_USERNAME and STEAM_PASSWORD in your .env file.",
      );
      console.error("See docs/steam-bot-setup.md for instructions.");
    } else if (message.includes("login failed")) {
      console.error("Authentication failed. Check your Steam credentials.");
      console.error("Make sure Steam Guard is disabled on the bot account.");
    } else if (message.includes("timed out")) {
      console.error("The GC did not respond in time. This could indicate:");
      console.error("  - Steam servers are under load");
      console.error("  - The bot account is being rate-limited");
      console.error("  - Network connectivity issues");
    }

    console.error();
    console.error(
      "Recommendation: If this error persists, ship with OpenDota-only mode.",
    );
    process.exit(1);
  }

  // Step 2: Construct replay URL
  console.log("[2/3] Constructing replay URL...");
  const replayUrl = buildReplayUrl(matchId, cluster, replaySalt);
  console.log(`  URL: ${replayUrl}`);
  console.log();

  // Step 3: Validate URL with HEAD request
  console.log("[3/3] Validating replay URL with HEAD request...");
  try {
    const response = await fetch(replayUrl, {
      method: "HEAD",
      redirect: "manual",
    });

    const status = response.status;
    console.log(`  Status: ${status} ${response.statusText}`);

    if (status === 200 || status === 302) {
      console.log();
      console.log("=== SPIKE RESULT: SUCCESS ===");
      console.log("The Steam GC fallback is VIABLE for replay acquisition.");
      console.log();
      console.log("Summary:");
      console.log(`  Match ID:     ${matchId}`);
      console.log(`  Cluster:      ${cluster}`);
      console.log(`  Replay Salt:  ${replaySalt}`);
      console.log(`  Replay URL:   ${replayUrl}`);
      console.log(`  HEAD Status:  ${status}`);
      console.log();
      console.log(
        "Recommendation: Include GC fallback in the replay pipeline (Plan 03).",
      );
    } else if (status === 404) {
      console.log();
      console.log("=== SPIKE RESULT: PARTIAL SUCCESS ===");
      console.log(
        "GC returned replay salt, but the replay file is not available at the CDN.",
      );
      console.log(
        "This likely means the replay has expired (Valve deletes replays after ~10 days).",
      );
      console.log();
      console.log(
        "Recommendation: Try again with a very recent match ID (< 24 hours old).",
      );
    } else {
      console.log();
      console.log("=== SPIKE RESULT: UNCERTAIN ===");
      console.log(`Unexpected HTTP status ${status} from replay CDN.`);
      console.log(
        "Recommendation: Investigate further or try a different match ID.",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`  HEAD request failed: ${message}`);
    console.log();
    console.log("=== SPIKE RESULT: PARTIAL SUCCESS ===");
    console.log(
      "GC returned data, but could not validate the URL (network issue).",
    );
    console.log(
      "Recommendation: The GC path works; URL validation can be retried.",
    );
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
