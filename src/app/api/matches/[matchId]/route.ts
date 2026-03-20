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
      players:
        match.status === "complete"
          ? match.players.map((p) => ({
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
