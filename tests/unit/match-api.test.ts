import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma before importing the route
const mockFindUnique = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    match: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

// Mock the queue module (imported by the route but not used in GET)
vi.mock("@/lib/queue", () => ({
  replayQueue: {
    add: vi.fn(),
  },
}));

// Mock the validation module
vi.mock("@/lib/validation", () => ({
  validateMatchId: (id: string) => {
    if (/^\d+$/.test(id)) return { valid: true, error: null };
    return { valid: false, error: "Invalid match ID" };
  },
}));

import { GET } from "@/app/api/matches/[matchId]/route";
import { NextRequest } from "next/server";

function makeRequest(matchId: string): NextRequest {
  return new NextRequest(
    new URL(`http://localhost:3000/api/matches/${matchId}`)
  );
}

function makeParams(matchId: string) {
  return { params: Promise.resolve({ matchId }) };
}

// Fake match data with all Phase 2 fields
const fakeMatch = {
  id: "cuid1",
  matchId: BigInt("7000000001"),
  status: "complete",
  duration: 2400,
  startTime: new Date("2025-01-01T00:00:00Z"),
  gameMode: 22,
  radiantWin: true,
  cluster: 111,
  replayUrl: "https://example.com/replay.dem.bz2",
  parsedAt: new Date("2025-01-01T01:00:00Z"),
  errorMsg: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  // Phase 2 match fields
  radiantScore: 35,
  direScore: 22,
  firstBloodTime: 45,
  lobbyType: 0,
  patch: 54,
  radiantGoldAdv: [0, 500, 1200, -300, 2000],
  radiantXpAdv: [0, 200, 800, -100, 1500],
  objectives: [
    { type: "firstblood", time: 45, team: 2, player_slot: 0 },
    { type: "tower", time: 600, team: 3, key: "npc_dota_goodguys_tower1_bot" },
  ],
  teamfights: null,
  players: [
    {
      id: "player1",
      matchId: BigInt("7000000001"),
      heroId: 1,
      playerSlot: 0,
      accountId: BigInt("123456789"),
      kills: 10,
      deaths: 3,
      assists: 15,
      goldPerMin: 600,
      xpPerMin: 700,
      lastHits: 250,
      denies: 10,
      heroDamage: 25000,
      towerDamage: 5000,
      heroHealing: 0,
      items: [1, 2, 3, 4, 5, 6],
      // Phase 2 fields
      personaname: "TestPlayer",
      isRadiant: true,
      level: 25,
      netWorth: 30000,
      totalGold: 35000,
      totalXp: 40000,
      goldSpent: 28000,
      itemNeutral: 287,
      backpack0: null,
      backpack1: null,
      backpack2: null,
      lane: 2,
      laneRole: 2,
      laneEfficiency: 0.85,
      isRoaming: false,
      goldT: [0, 200, 500, 900, 1400],
      xpT: [0, 300, 700, 1100, 1600],
      lhT: [0, 5, 12, 20, 30],
      dnT: [0, 0, 1, 2, 3],
      kda: 8.33,
      killsPerMin: 0.25,
      heroKills: null,
      towerKills: null,
      courierKills: null,
      observerKills: null,
      sentryKills: null,
      roshanKills: null,
      campsStacked: null,
      stuns: null,
      actionsPerMin: null,
      teamfightParticipation: null,
      buybackCount: null,
      obsPlaced: 3,
      senPlaced: 5,
      rankTier: null,
      benchmarks: {
        gold_per_min: { raw: 600, pct: 0.82 },
        xp_per_min: { raw: 700, pct: 0.75 },
      },
      lanePos: null,
      obs: null,
      sen: null,
      killsLog: null,
      purchaseLog: [
        { time: 60, key: "tango" },
        { time: 300, key: "boots" },
      ],
      runesLog: [{ time: 120, key: 5 }],
      abilityUpgrades: [
        { ability: 5003, time: 30, level: 1 },
      ],
      damage: { npc_dota_hero_pudge: 5000 },
      damageTargets: null,
      damageTaken: { npc_dota_hero_pudge: 3000 },
    },
  ],
};

describe("GET /api/matches/:matchId", () => {
  beforeEach(() => {
    mockFindUnique.mockReset();
  });

  it("returns 200 with all Phase 2 fields for a complete match", async () => {
    mockFindUnique.mockResolvedValue(fakeMatch);

    const res = await GET(makeRequest("7000000001"), makeParams("7000000001"));
    expect(res.status).toBe(200);

    const body = await res.json();

    // Match-level Phase 2 fields
    expect(body.radiantScore).toBe(35);
    expect(body.direScore).toBe(22);
    expect(body.firstBloodTime).toBe(45);
    expect(body.lobbyType).toBe(0);
    expect(body.radiantGoldAdv).toEqual([0, 500, 1200, -300, 2000]);
    expect(body.radiantXpAdv).toEqual([0, 200, 800, -100, 1500]);
    expect(body.objectives).toHaveLength(2);
    expect(body.objectives[0].type).toBe("firstblood");
  });

  it("serializes BigInt fields as strings", async () => {
    mockFindUnique.mockResolvedValue(fakeMatch);

    const res = await GET(makeRequest("7000000001"), makeParams("7000000001"));
    const body = await res.json();

    expect(body.matchId).toBe("7000000001");
    expect(body.players[0].accountId).toBe("123456789");
    // Ensure they are strings, not numbers
    expect(typeof body.matchId).toBe("string");
    expect(typeof body.players[0].accountId).toBe("string");
  });

  it("returns all Phase 2 player fields", async () => {
    mockFindUnique.mockResolvedValue(fakeMatch);

    const res = await GET(makeRequest("7000000001"), makeParams("7000000001"));
    const body = await res.json();
    const player = body.players[0];

    // Phase 2 player fields
    expect(player.personaname).toBe("TestPlayer");
    expect(player.isRadiant).toBe(true);
    expect(player.level).toBe(25);
    expect(player.netWorth).toBe(30000);
    expect(player.itemNeutral).toBe(287);
    expect(player.lane).toBe(2);
    expect(player.laneRole).toBe(2);
    expect(player.laneEfficiency).toBe(0.85);
    expect(player.isRoaming).toBe(false);
    expect(player.obsPlaced).toBe(3);
    expect(player.senPlaced).toBe(5);
  });

  it("preserves JSON fields as arrays/objects", async () => {
    mockFindUnique.mockResolvedValue(fakeMatch);

    const res = await GET(makeRequest("7000000001"), makeParams("7000000001"));
    const body = await res.json();
    const player = body.players[0];

    // Time-series arrays
    expect(Array.isArray(player.goldT)).toBe(true);
    expect(player.goldT).toEqual([0, 200, 500, 900, 1400]);
    expect(Array.isArray(player.xpT)).toBe(true);
    expect(Array.isArray(player.lhT)).toBe(true);
    expect(Array.isArray(player.dnT)).toBe(true);

    // Complex JSON fields
    expect(player.benchmarks).toEqual({
      gold_per_min: { raw: 600, pct: 0.82 },
      xp_per_min: { raw: 700, pct: 0.75 },
    });
    expect(player.purchaseLog).toHaveLength(2);
    expect(player.abilityUpgrades).toHaveLength(1);
    expect(player.damage).toEqual({ npc_dota_hero_pudge: 5000 });
    expect(player.damageTaken).toEqual({ npc_dota_hero_pudge: 3000 });
    expect(player.runesLog).toHaveLength(1);
  });

  it("returns 404 for non-existent match", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(makeRequest("9999999999"), makeParams("9999999999"));
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe("Match not found");
  });

  it("returns empty players array for non-complete match", async () => {
    mockFindUnique.mockResolvedValue({
      ...fakeMatch,
      status: "parsing",
      players: fakeMatch.players,
    });

    const res = await GET(makeRequest("7000000001"), makeParams("7000000001"));
    const body = await res.json();

    expect(body.status).toBe("parsing");
    expect(body.players).toEqual([]);
  });
});
