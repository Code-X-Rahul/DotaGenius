import { Worker, Job } from "bullmq";
import { redisConnectionOptions } from "../lib/redis";
import { prisma } from "../lib/db";
import { getMatch, isReplayLikelyExpired } from "../lib/opendota";
import { parseReplay, ParsedEvent } from "../lib/parser";
import type { ReplayJobData } from "../lib/queue";

/**
 * Replay pipeline worker -- runs as a SEPARATE process from Next.js.
 * Start with: npx tsx src/workers/replay-worker.ts
 *
 * Flow: getMatch (OpenDota) -> parseReplay (odota/parser) -> store in PostgreSQL
 * No Steam GC fallback -- OpenDota is the sole replay URL source.
 */

interface WorkerProgress {
  stage: "downloading" | "parsing" | "storing" | "complete";
  percent: number;
  message?: string;
}

function extractCombatLogEvents(
  events: ParsedEvent[],
  matchId: bigint
): Array<{
  matchId: bigint;
  gameTime: number;
  eventType: string;
  attackerHero: string | null;
  targetHero: string | null;
  inflictor: string | null;
  value: number | null;
  isAttackerHero: boolean;
  isTargetHero: boolean;
}> {
  return events
    .filter((e) => e.type === "combat_log" && typeof e.time === "number")
    .map((e) => ({
      matchId,
      gameTime: e.time as number,
      eventType: (e.event as string) || "unknown",
      attackerHero: (e.attackername as string) || null,
      targetHero: (e.targetname as string) || null,
      inflictor: (e.inflictor as string) || null,
      value: typeof e.value === "number" ? e.value : null,
      isAttackerHero: (e.attackerhero as boolean) || false,
      isTargetHero: (e.targethero as boolean) || false,
    }));
}

function extractPositionSnapshots(
  events: ParsedEvent[],
  matchId: bigint
): Array<{
  matchId: bigint;
  gameTime: number;
  heroId: number;
  x: number;
  y: number;
  gold: number;
  xp: number;
}> {
  return events
    .filter(
      (e) =>
        e.type === "hero_position" &&
        typeof e.time === "number" &&
        typeof e.hero_id === "number"
    )
    // Filter to every 10 seconds (allow for slight timing drift)
    .filter((e) => (e.time as number) % 10 < 2)
    .map((e) => ({
      matchId,
      gameTime: e.time as number,
      heroId: e.hero_id as number,
      x: (e.x as number) || 0,
      y: (e.y as number) || 0,
      gold: (e.gold as number) || 0,
      xp: (e.xp as number) || 0,
    }));
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
      `Warning: Match ${matchId} is older than 10 days, replay may be unavailable`
    );
  }

  // Create/update Match record with status 'downloading'
  const matchIdBigInt = BigInt(matchId);
  await prisma.match.upsert({
    where: { matchId: matchIdBigInt },
    create: {
      matchId: matchIdBigInt,
      duration: matchData.duration,
      startTime: new Date(matchData.start_time * 1000),
      gameMode: matchData.game_mode,
      radiantWin: matchData.radiant_win,
      cluster: matchData.cluster,
      status: "downloading",
    },
    update: {
      status: "downloading",
      errorMsg: null,
    },
  });

  // Determine replay URL -- OpenDota only (no GC fallback)
  const replayUrl = matchData.replay_url;
  if (!replayUrl) {
    throw new Error(
      `Replay URL not available for match ${matchId}. OpenDota has not parsed this match.`
    );
  }

  // Stage 2: Parse replay via odota/parser
  await job.updateProgress({
    stage: "parsing",
    percent: 30,
    message: "Sending replay to parser",
  } satisfies WorkerProgress);

  const events = await parseReplay(replayUrl);

  await prisma.match.update({
    where: { matchId: matchIdBigInt },
    data: { status: "parsing" },
  });

  // Stage 3: Store parsed data in PostgreSQL
  await job.updateProgress({
    stage: "storing",
    percent: 60,
    message: "Storing parsed data",
  } satisfies WorkerProgress);

  await prisma.$transaction(async (tx) => {
    // Upsert player records from OpenDota match data
    for (const player of matchData.players) {
      await tx.player.upsert({
        where: {
          matchId_playerSlot: {
            matchId: matchIdBigInt,
            playerSlot: player.player_slot,
          },
        },
        create: {
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
        },
        update: {
          heroId: player.hero_id,
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
        },
      });
    }

    // Batch insert combat log events
    const combatLogRecords = extractCombatLogEvents(events, matchIdBigInt);
    if (combatLogRecords.length > 0) {
      // Delete existing combat log events for re-parse scenario
      await tx.combatLogEvent.deleteMany({
        where: { matchId: matchIdBigInt },
      });
      await tx.combatLogEvent.createMany({
        data: combatLogRecords,
      });
    }

    // Batch insert position snapshots
    const positionRecords = extractPositionSnapshots(events, matchIdBigInt);
    if (positionRecords.length > 0) {
      // Delete existing snapshots for re-parse scenario
      await tx.positionSnapshot.deleteMany({
        where: { matchId: matchIdBigInt },
      });
      await tx.positionSnapshot.createMany({
        data: positionRecords,
      });
    }
  });

  // Update match status to complete
  await prisma.match.update({
    where: { matchId: matchIdBigInt },
    data: {
      status: "complete",
      parsedAt: new Date(),
      replayUrl,
    },
  });

  await job.updateProgress({
    stage: "complete",
    percent: 100,
    message: "Replay processed successfully",
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
            errorMsg:
              error instanceof Error ? error.message : "Unknown error",
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
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed for match ${job.data.matchId}`);
});

worker.on("failed", (job, err) => {
  console.error(
    `Job ${job?.id} failed for match ${job?.data.matchId}: ${err.message}`
  );
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

console.log("Replay worker started, waiting for jobs...");

export { worker };
