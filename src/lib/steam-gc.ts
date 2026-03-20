/**
 * Steam Game Coordinator client for Dota 2 replay salt retrieval.
 *
 * Uses steam-user for Steam authentication and dota2-user for GC access.
 * Fetches the replay_salt and cluster values needed to construct Valve CDN
 * replay download URLs for matches that OpenDota hasn't parsed.
 *
 * Environment variables:
 *   STEAM_USERNAME - Steam bot account username
 *   STEAM_PASSWORD - Steam bot account password
 */

import SteamUser from "steam-user";
import { Dota2User } from "dota2-user";
import { EDOTAGCMsg } from "dota2-user/protobufs/generated/dota_gcmessages_msgid";
import type { CMsgGCMatchDetailsResponse } from "dota2-user/protobufs/generated/dota_gcmessages_client";
import { CMsgDOTAMatch_ReplayState } from "dota2-user/protobufs/generated/dota_gcmessages_common";

const GC_TIMEOUT_MS = 30_000;

/** Tracks request count for rate-limit awareness (100 req/24hr per account). */
let requestCount = 0;
let requestWindowStart = Date.now();
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_MAX = 100;

export interface ReplaySaltResult {
  cluster: number;
  replaySalt: number;
}

/**
 * Retrieve the replay salt and cluster for a given match ID from the Dota 2 GC.
 *
 * @param matchId - The Dota 2 match ID to look up
 * @returns The cluster and replay salt, or null if the match was not found / replay unavailable
 * @throws Error on authentication failure, GC timeout, or other Steam errors
 */
export async function getReplaySalt(
  matchId: string
): Promise<ReplaySaltResult | null> {
  const username = process.env.STEAM_USERNAME;
  const password = process.env.STEAM_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "STEAM_USERNAME and STEAM_PASSWORD must be set in environment variables. " +
        "See docs/steam-bot-setup.md for setup instructions."
    );
  }

  // Rate limit awareness
  const now = Date.now();
  if (now - requestWindowStart > RATE_LIMIT_WINDOW_MS) {
    requestCount = 0;
    requestWindowStart = now;
  }
  requestCount++;
  if (requestCount >= RATE_LIMIT_MAX - 10) {
    console.warn(
      `[steam-gc] WARNING: Approaching rate limit (${requestCount}/${RATE_LIMIT_MAX} requests in current 24hr window)`
    );
  }
  if (requestCount > RATE_LIMIT_MAX) {
    throw new Error(
      `[steam-gc] Rate limit exceeded: ${requestCount} requests in 24hr window (max ${RATE_LIMIT_MAX})`
    );
  }

  const steam = new SteamUser();
  const dota2 = new Dota2User(steam);

  try {
    // Step 1: Log into Steam
    await loginToSteam(steam, username, password);

    // Step 2: Wait for GC session
    await waitForGCSession(dota2);

    // Step 3: Request match details from GC
    const response = await requestMatchDetails(dota2, matchId);

    if (!response.match) {
      console.error(`[steam-gc] Match ${matchId} not found in GC response`);
      return null;
    }

    const { cluster, replaySalt, replayState } = response.match;

    if (replayState === CMsgDOTAMatch_ReplayState.REPLAY_EXPIRED) {
      console.warn(
        `[steam-gc] Replay for match ${matchId} has expired (replayState=REPLAY_EXPIRED)`
      );
      return null;
    }

    if (replayState === CMsgDOTAMatch_ReplayState.REPLAY_NOT_RECORDED) {
      console.warn(
        `[steam-gc] Replay for match ${matchId} was not recorded (replayState=REPLAY_NOT_RECORDED)`
      );
      return null;
    }

    if (!replaySalt || !cluster) {
      console.warn(
        `[steam-gc] Match ${matchId} missing replay data: cluster=${cluster}, replaySalt=${replaySalt}`
      );
      return null;
    }

    return { cluster, replaySalt };
  } finally {
    // Always clean up: log off Steam
    try {
      steam.logOff();
    } catch {
      // Ignore logoff errors during cleanup
    }
  }
}

/**
 * Construct the Valve CDN replay download URL from cluster, match ID, and replay salt.
 */
export function buildReplayUrl(
  matchId: string,
  cluster: number,
  replaySalt: number
): string {
  return `http://replay${cluster}.valve.net/570/${matchId}_${replaySalt}.dem.bz2`;
}

// --- Internal helpers ---

function loginToSteam(
  steam: SteamUser,
  accountName: string,
  password: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("[steam-gc] Steam login timed out after 30 seconds"));
    }, GC_TIMEOUT_MS);

    steam.on("loggedOn", () => {
      clearTimeout(timeout);
      resolve();
    });

    steam.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(
        new Error(`[steam-gc] Steam login failed: ${err.message}`)
      );
    });

    steam.logOn({ accountName, password });
  });
}

function waitForGCSession(dota2: Dota2User): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          "[steam-gc] Dota 2 GC session timed out after 30 seconds"
        )
      );
    }, GC_TIMEOUT_MS);

    if (dota2.haveGCSession) {
      clearTimeout(timeout);
      resolve();
      return;
    }

    dota2.on("connectedToGC", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function requestMatchDetails(
  dota2: Dota2User,
  matchId: string
): Promise<CMsgGCMatchDetailsResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `[steam-gc] GC match details request timed out after 30 seconds for match ${matchId}`
        )
      );
    }, GC_TIMEOUT_MS);

    // Listen for the response
    const handler = (data: CMsgGCMatchDetailsResponse) => {
      clearTimeout(timeout);
      resolve(data);
    };
    dota2.router.once(
      EDOTAGCMsg.k_EMsgGCMatchDetailsResponse,
      handler
    );

    // Send the request
    dota2.send(EDOTAGCMsg.k_EMsgGCMatchDetailsRequest, {
      matchId,
    });
  });
}
