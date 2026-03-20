import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { replayQueue } from "@/lib/queue";
import { validateMatchId } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ matchId: string }>;
}

/**
 * POST /api/matches/:matchId
 * Submit a match for replay analysis. Returns 202 if queued, 200 if already complete.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { matchId } = await params;

  // Validate match ID
  const validation = validateMatchId(matchId);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  try {
    // Check if match already exists and is complete
    const existing = await prisma.match.findUnique({
      where: { matchId: BigInt(matchId) },
      include: { players: true },
    });

    if (existing && existing.status === "complete") {
      return NextResponse.json({
        matchId,
        status: "complete",
        match: {
          ...existing,
          matchId: existing.matchId.toString(),
          players: existing.players.map((p) => ({
            ...p,
            matchId: p.matchId.toString(),
            accountId: p.accountId?.toString() ?? null,
          })),
        },
      });
    }

    // If already queued/processing, return current status
    if (existing && ["downloading", "parsing", "pending"].includes(existing.status)) {
      return NextResponse.json(
        {
          matchId,
          status: existing.status,
          message: "Match is already being processed",
        },
        { status: 202 }
      );
    }

    // Enqueue job with matchId as job ID (prevents duplicates)
    const job = await replayQueue.add(
      "process-replay",
      { matchId },
      { jobId: `replay-${matchId}` }
    );

    return NextResponse.json(
      {
        jobId: job.id,
        matchId,
        status: "queued",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error(`Error processing match ${matchId}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/matches/:matchId
 * Retrieve match data or current processing status.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { matchId } = await params;

  // Validate match ID
  const validation = validateMatchId(matchId);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  try {
    const match = await prisma.match.findUnique({
      where: { matchId: BigInt(matchId) },
      include: {
        players: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    // Serialize BigInt fields to strings for JSON
    return NextResponse.json({
      matchId: match.matchId.toString(),
      status: match.status,
      duration: match.duration,
      startTime: match.startTime,
      gameMode: match.gameMode,
      radiantWin: match.radiantWin,
      cluster: match.cluster,
      replayUrl: match.replayUrl,
      parsedAt: match.parsedAt,
      errorMsg: match.errorMsg,
      // Phase 2: Match-level fields
      radiantScore: match.radiantScore,
      direScore: match.direScore,
      firstBloodTime: match.firstBloodTime,
      lobbyType: match.lobbyType,
      radiantGoldAdv: match.radiantGoldAdv,
      radiantXpAdv: match.radiantXpAdv,
      objectives: match.objectives,
      players:
        match.status === "complete"
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
              // Phase 2: Identity & team
              personaname: p.personaname,
              isRadiant: p.isRadiant,
              level: p.level,
              netWorth: p.netWorth,
              itemNeutral: p.itemNeutral,
              // Phase 2: Laning
              lane: p.lane,
              laneRole: p.laneRole,
              laneEfficiency: p.laneEfficiency,
              isRoaming: p.isRoaming,
              // Phase 2: Time-series arrays
              goldT: p.goldT,
              xpT: p.xpT,
              lhT: p.lhT,
              dnT: p.dnT,
              // Phase 2: Benchmarks & stats
              benchmarks: p.benchmarks,
              obsPlaced: p.obsPlaced,
              senPlaced: p.senPlaced,
              // Phase 2: Detail fields
              purchaseLog: p.purchaseLog,
              abilityUpgrades: p.abilityUpgrades,
              damage: p.damage,
              damageTaken: p.damageTaken,
              runesLog: p.runesLog,
            }))
          : [],
    });
  } catch (error) {
    console.error(`Error fetching match ${matchId}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
