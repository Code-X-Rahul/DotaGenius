import { Worker, Job } from "bullmq";
import { redisConnectionOptions } from "../lib/redis";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db";
import { getMatch, isReplayLikelyExpired } from "../lib/opendota";
import type { OpenDotaPlayer } from "../lib/opendota";
import type { ReplayJobData } from "../lib/queue";

/**
 * Replay pipeline worker -- runs as a SEPARATE process from Next.js.
 * Start with: npx tsx src/workers/replay-worker.ts
 *
 * Flow: getMatch (OpenDota) -> store all data in PostgreSQL
 * OpenDota API returns both match metadata AND parsed replay data
 * (gold_t, xp_t, lane_pos, kills_log, etc.) for matches it has processed.
 * No Steam GC fallback -- OpenDota is the sole data source.
 */

interface WorkerProgress {
  stage: "downloading" | "parsing" | "storing" | "complete";
  percent: number;
  message?: string;
}

/** Convert a value to Prisma-compatible Json: use DbNull for null/undefined, otherwise pass through */
function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value == null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

function buildPlayerData(player: OpenDotaPlayer, matchIdBigInt: bigint) {
  return {
    matchId: matchIdBigInt,
    playerSlot: player.player_slot,
    heroId: player.hero_id,
    accountId: player.account_id ? BigInt(player.account_id) : null,
    kills: player.kills,
    deaths: player.deaths,
    assists: player.assists,
    goldPerMin: player.gold_per_min,
    xpPerMin: player.xp_per_min,
    lastHits: player.last_hits,
    denies: player.denies,
    heroDamage: player.hero_damage,
    towerDamage: player.tower_damage,
    heroHealing: player.hero_healing,
    items: [
      player.item_0 ?? 0,
      player.item_1 ?? 0,
      player.item_2 ?? 0,
      player.item_3 ?? 0,
      player.item_4 ?? 0,
      player.item_5 ?? 0,
    ],

    // Identity & team
    personaname: player.personaname ?? null,
    isRadiant: player.isRadiant ?? player.player_slot < 128,
    level: player.level ?? 0,
    netWorth: player.net_worth ?? 0,
    totalGold: player.total_gold ?? 0,
    totalXp: player.total_xp ?? 0,
    goldSpent: player.gold_spent ?? 0,

    // Extended items
    itemNeutral: player.item_neutral ?? null,
    backpack0: player.backpack_0 ?? null,
    backpack1: player.backpack_1 ?? null,
    backpack2: player.backpack_2 ?? null,

    // Laning
    lane: player.lane ?? null,
    laneRole: player.lane_role ?? null,
    laneEfficiency: player.lane_efficiency ?? null,
    isRoaming: player.is_roaming ?? false,

    // Time-series (Json fields — use jsonOrNull for Prisma compatibility)
    goldT: jsonOrNull(player.gold_t),
    xpT: jsonOrNull(player.xp_t),
    lhT: jsonOrNull(player.lh_t),
    dnT: jsonOrNull(player.dn_t),

    // Stats
    kda: player.kda ?? null,
    killsPerMin: player.kills_per_min ?? null,
    heroKills: player.hero_kills ?? null,
    towerKills: player.tower_kills ?? null,
    courierKills: player.courier_kills ?? null,
    observerKills: player.observer_kills ?? null,
    sentryKills: player.sentry_kills ?? null,
    roshanKills: player.roshan_kills ?? null,
    campsStacked: player.camps_stacked ?? null,
    stuns: player.stuns ?? null,
    actionsPerMin: player.actions_per_min ?? null,
    teamfightParticipation: player.teamfight_participation ?? null,
    buybackCount: player.buyback_count ?? null,
    obsPlaced: player.obs_placed ?? null,
    senPlaced: player.sen_placed ?? null,
    rankTier: player.rank_tier ?? null,

    // Benchmarks (Json)
    benchmarks: jsonOrNull(player.benchmarks),

    // Spatial (Json)
    lanePos: jsonOrNull(player.lane_pos),
    obs: jsonOrNull(player.obs),
    sen: jsonOrNull(player.sen),

    // Detailed logs (Json)
    killsLog: jsonOrNull(player.kills_log),
    purchaseLog: jsonOrNull(player.purchase_log),
    runesLog: jsonOrNull(player.runes_log),
    abilityUpgrades: jsonOrNull(player.ability_upgrades_arr),
    damage: jsonOrNull(player.damage),
    damageTargets: jsonOrNull(player.damage_targets),
    damageTaken: jsonOrNull(player.damage_taken),
  };
}

async function processReplayJob(job: Job<ReplayJobData>): Promise<void> {
  const { matchId } = job.data;

  // Stage 1: Fetch match data from OpenDota
  await job.updateProgress({
    stage: "downloading",
    percent: 0,
    message: "Fetching match data from OpenDota",
  } satisfies WorkerProgress);

  const matchData = await getMatch(matchId);

  // Check for replay expiry warning (still attempt, but log)
  if (isReplayLikelyExpired(matchData.start_time)) {
    await job.log(
      `Warning: Match ${matchId} is older than 10 days, replay may be unavailable`,
    );
  }

  // Verify OpenDota has parsed data (gold_t exists on players)
  const hasParsedData = matchData.players.some((p) => p.gold_t && p.gold_t.length > 0);
  if (!hasParsedData) {
    await job.log(
      `Warning: Match ${matchId} has no parsed replay data from OpenDota. Stats will be limited.`,
    );
  }

  const matchIdBigInt = BigInt(matchId);

  // Stage 2: Mark as parsing
  await job.updateProgress({
    stage: "parsing",
    percent: 30,
    message: "Processing match data",
  } satisfies WorkerProgress);

  // Create/update Match record
  await prisma.match.upsert({
    where: { matchId: matchIdBigInt },
    create: {
      matchId: matchIdBigInt,
      duration: matchData.duration,
      startTime: new Date(matchData.start_time * 1000),
      gameMode: matchData.game_mode,
      radiantWin: matchData.radiant_win,
      cluster: matchData.cluster,
      status: "parsing",
      radiantScore: matchData.radiant_score ?? null,
      direScore: matchData.dire_score ?? null,
      firstBloodTime: matchData.first_blood_time ?? null,
      lobbyType: matchData.lobby_type ?? null,
      patch: matchData.patch ?? null,
      radiantGoldAdv: jsonOrNull(matchData.radiant_gold_adv),
      radiantXpAdv: jsonOrNull(matchData.radiant_xp_adv),
      objectives: jsonOrNull(matchData.objectives),
      teamfights: jsonOrNull(matchData.teamfights),
    },
    update: {
      status: "parsing",
      errorMsg: null,
      radiantScore: matchData.radiant_score ?? null,
      direScore: matchData.dire_score ?? null,
      firstBloodTime: matchData.first_blood_time ?? null,
      lobbyType: matchData.lobby_type ?? null,
      patch: matchData.patch ?? null,
      radiantGoldAdv: jsonOrNull(matchData.radiant_gold_adv),
      radiantXpAdv: jsonOrNull(matchData.radiant_xp_adv),
      objectives: jsonOrNull(matchData.objectives),
      teamfights: jsonOrNull(matchData.teamfights),
    },
  });

  // Stage 3: Store player data
  await job.updateProgress({
    stage: "storing",
    percent: 60,
    message: "Storing player data",
  } satisfies WorkerProgress);

  await prisma.$transaction(async (tx) => {
    // Upsert all 10 player records with full data
    for (const player of matchData.players) {
      const data = buildPlayerData(player, matchIdBigInt);
      await tx.player.upsert({
        where: {
          matchId_playerSlot: {
            matchId: matchIdBigInt,
            playerSlot: player.player_slot,
          },
        },
        create: data,
        update: data,
      });
    }

    // Store combat events from kills_log + objectives
    const combatRecords: Array<{
      matchId: bigint;
      gameTime: number;
      eventType: string;
      attackerHero: string | null;
      targetHero: string | null;
      inflictor: string | null;
      value: number | null;
      isAttackerHero: boolean;
      isTargetHero: boolean;
    }> = [];

    // Player kills
    for (const player of matchData.players) {
      const heroName = `hero_${player.hero_id}`;
      for (const kill of player.kills_log ?? []) {
        combatRecords.push({
          matchId: matchIdBigInt,
          gameTime: kill.time,
          eventType: "kill",
          attackerHero: heroName,
          targetHero: kill.key || null,
          inflictor: null,
          value: null,
          isAttackerHero: true,
          isTargetHero: true,
        });
      }
    }

    // Match objectives (towers, first blood, roshan, etc.)
    for (const obj of matchData.objectives ?? []) {
      combatRecords.push({
        matchId: matchIdBigInt,
        gameTime: obj.time,
        eventType: obj.type,
        attackerHero: obj.unit ?? null,
        targetHero: obj.key ?? null,
        inflictor: null,
        value: obj.value ?? null,
        isAttackerHero: false,
        isTargetHero: false,
      });
    }

    if (combatRecords.length > 0) {
      await tx.combatLogEvent.deleteMany({ where: { matchId: matchIdBigInt } });
      await tx.combatLogEvent.createMany({ data: combatRecords });
    }
  });

  // Update match status to complete
  await prisma.match.update({
    where: { matchId: matchIdBigInt },
    data: {
      status: "complete",
      parsedAt: new Date(),
      replayUrl: matchData.replay_url ?? null,
    },
  });

  const playerCount = matchData.players.length;
  const hasGraphData = hasParsedData ? "yes" : "no";
  console.log(
    `[match ${matchId}] Complete: ${playerCount} players, graph data: ${hasGraphData}`,
  );

  await job.updateProgress({
    stage: "complete",
    percent: 100,
    message: "Match data stored successfully",
  } satisfies WorkerProgress);
}

// Create the worker
const worker = new Worker<ReplayJobData>(
  "replay-pipeline",
  async (job: Job<ReplayJobData>) => {
    try {
      await processReplayJob(job);
    } catch (error) {
      // Update match status to failed on error
      try {
        await prisma.match.update({
          where: { matchId: BigInt(job.data.matchId) },
          data: {
            status: "failed",
            errorMsg: error instanceof Error ? error.message : "Unknown error",
          },
        });
      } catch {
        // Match record may not exist yet if error happened early
      }
      throw error; // Rethrow for BullMQ retry
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency: 2,
  },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed for match ${job.data.matchId}`);
});

worker.on("failed", (job, err) => {
  console.error(
    `Job ${job?.id} failed for match ${job?.data.matchId}: ${err.message}`,
  );
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("Replay worker started, waiting for jobs...");

export { worker };
