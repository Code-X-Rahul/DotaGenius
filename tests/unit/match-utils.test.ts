import { describe, it, expect } from "vitest";
import {
  getTeamPlayers,
  getCsAt10,
  getDnAt10,
  getLaneMatchups,
  getRoamingPlayers,
  buildAdvantageData,
  buildPerPlayerData,
  benchmarkColor,
  LANE_LABELS,
} from "@/lib/match-utils";
import type { PlayerData } from "@/lib/match-types";

// Helper to build a minimal PlayerData for testing
function makePlayer(overrides: Partial<PlayerData>): PlayerData {
  return {
    heroId: 1,
    playerSlot: 0,
    accountId: null,
    kills: 0,
    deaths: 0,
    assists: 0,
    goldPerMin: 0,
    xpPerMin: 0,
    lastHits: 0,
    denies: 0,
    heroDamage: 0,
    towerDamage: 0,
    heroHealing: 0,
    items: [],
    personaname: null,
    isRadiant: true,
    level: 1,
    netWorth: 0,
    itemNeutral: null,
    lane: null,
    laneRole: null,
    laneEfficiency: null,
    isRoaming: null,
    goldT: null,
    xpT: null,
    lhT: null,
    dnT: null,
    benchmarks: null,
    purchaseLog: null,
    abilityUpgrades: null,
    damage: null,
    damageTaken: null,
    obsPlaced: null,
    senPlaced: null,
    runesLog: null,
    ...overrides,
  };
}

describe("match-utils", () => {
  describe("getTeamPlayers", () => {
    it("splits players into radiant and dire by isRadiant", () => {
      const players = [
        makePlayer({ playerSlot: 0, isRadiant: true }),
        makePlayer({ playerSlot: 128, isRadiant: false }),
        makePlayer({ playerSlot: 1, isRadiant: true }),
        makePlayer({ playerSlot: 129, isRadiant: false }),
        makePlayer({ playerSlot: 2, isRadiant: true }),
        makePlayer({ playerSlot: 130, isRadiant: false }),
        makePlayer({ playerSlot: 3, isRadiant: true }),
        makePlayer({ playerSlot: 131, isRadiant: false }),
        makePlayer({ playerSlot: 4, isRadiant: true }),
        makePlayer({ playerSlot: 132, isRadiant: false }),
      ];

      const { radiant, dire } = getTeamPlayers(players);
      expect(radiant).toHaveLength(5);
      expect(dire).toHaveLength(5);
      expect(radiant.every((p) => p.isRadiant)).toBe(true);
      expect(dire.every((p) => !p.isRadiant)).toBe(true);
    });

    it("sorts players by playerSlot within each team", () => {
      const players = [
        makePlayer({ playerSlot: 4, isRadiant: true }),
        makePlayer({ playerSlot: 0, isRadiant: true }),
        makePlayer({ playerSlot: 2, isRadiant: true }),
      ];

      const { radiant } = getTeamPlayers(players);
      expect(radiant[0].playerSlot).toBe(0);
      expect(radiant[1].playerSlot).toBe(2);
      expect(radiant[2].playerSlot).toBe(4);
    });
  });

  describe("getCsAt10", () => {
    it("returns lhT[10] for a full array", () => {
      const lhT = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
      expect(getCsAt10(lhT)).toBe(50);
    });

    it("returns 0 for null", () => {
      expect(getCsAt10(null)).toBe(0);
    });

    it("returns 0 for short array (< 11 elements)", () => {
      expect(getCsAt10([0, 5, 10])).toBe(0);
    });
  });

  describe("getDnAt10", () => {
    it("returns dnT[10] for a full array", () => {
      const dnT = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      expect(getDnAt10(dnT)).toBe(10);
    });

    it("returns 0 for null", () => {
      expect(getDnAt10(null)).toBe(0);
    });
  });

  describe("getLaneMatchups", () => {
    it("groups players into lanes 1/2/3 by team", () => {
      const players = [
        makePlayer({ playerSlot: 0, isRadiant: true, lane: 1 }),
        makePlayer({ playerSlot: 1, isRadiant: true, lane: 2 }),
        makePlayer({ playerSlot: 2, isRadiant: true, lane: 3 }),
        makePlayer({ playerSlot: 128, isRadiant: false, lane: 1 }),
        makePlayer({ playerSlot: 129, isRadiant: false, lane: 2 }),
        makePlayer({ playerSlot: 130, isRadiant: false, lane: 3 }),
      ];

      const lanes = getLaneMatchups(players);
      expect(lanes[1].radiant).toHaveLength(1);
      expect(lanes[1].dire).toHaveLength(1);
      expect(lanes[2].radiant).toHaveLength(1);
      expect(lanes[2].dire).toHaveLength(1);
      expect(lanes[3].radiant).toHaveLength(1);
      expect(lanes[3].dire).toHaveLength(1);
    });

    it("excludes roaming players", () => {
      const players = [
        makePlayer({ playerSlot: 0, isRadiant: true, lane: 1 }),
        makePlayer({ playerSlot: 1, isRadiant: true, lane: 2, isRoaming: true }),
      ];

      const lanes = getLaneMatchups(players);
      expect(lanes[1].radiant).toHaveLength(1);
      expect(lanes[2].radiant).toHaveLength(0);
    });

    it("excludes players with invalid lane values", () => {
      const players = [
        makePlayer({ playerSlot: 0, isRadiant: true, lane: 0 }),
        makePlayer({ playerSlot: 1, isRadiant: true, lane: 5 }),
        makePlayer({ playerSlot: 2, isRadiant: true, lane: null }),
      ];

      const lanes = getLaneMatchups(players);
      expect(lanes[1].radiant).toHaveLength(0);
      expect(lanes[2].radiant).toHaveLength(0);
      expect(lanes[3].radiant).toHaveLength(0);
    });
  });

  describe("getRoamingPlayers", () => {
    it("returns players with isRoaming=true", () => {
      const players = [
        makePlayer({ playerSlot: 0, isRoaming: true, lane: 2 }),
        makePlayer({ playerSlot: 1, isRoaming: false, lane: 1 }),
      ];

      const roaming = getRoamingPlayers(players);
      expect(roaming).toHaveLength(1);
      expect(roaming[0].playerSlot).toBe(0);
    });

    it("returns players with invalid lane (null, 0, >3)", () => {
      const players = [
        makePlayer({ playerSlot: 0, lane: null, isRoaming: false }),
        makePlayer({ playerSlot: 1, lane: 0, isRoaming: false }),
        makePlayer({ playerSlot: 2, lane: 5, isRoaming: false }),
        makePlayer({ playerSlot: 3, lane: 2, isRoaming: false }),
      ];

      const roaming = getRoamingPlayers(players);
      expect(roaming).toHaveLength(3);
    });
  });

  describe("buildAdvantageData", () => {
    it("converts parallel gold/xp arrays into AdvantagePoint[]", () => {
      const goldAdv = [0, 100, 200, 300];
      const xpAdv = [0, 50, 150, 250];

      const data = buildAdvantageData(goldAdv, xpAdv);
      expect(data).toHaveLength(4);
      expect(data[0]).toEqual({ minute: 0, gold: 0, xp: 0 });
      expect(data[2]).toEqual({ minute: 2, gold: 200, xp: 150 });
    });

    it("returns empty array for null inputs", () => {
      expect(buildAdvantageData(null, null)).toEqual([]);
    });

    it("handles mismatched array lengths", () => {
      const goldAdv = [0, 100, 200];
      const xpAdv = [0, 50];

      const data = buildAdvantageData(goldAdv, xpAdv);
      expect(data).toHaveLength(3);
      expect(data[2]).toEqual({ minute: 2, gold: 200, xp: 0 });
    });
  });

  describe("benchmarkColor", () => {
    it("returns --success for pct >= 0.7", () => {
      expect(benchmarkColor(0.7)).toBe("var(--success)");
      expect(benchmarkColor(0.9)).toBe("var(--success)");
      expect(benchmarkColor(1.0)).toBe("var(--success)");
    });

    it("returns --error for pct <= 0.3", () => {
      expect(benchmarkColor(0.3)).toBe("var(--error)");
      expect(benchmarkColor(0.1)).toBe("var(--error)");
      expect(benchmarkColor(0.0)).toBe("var(--error)");
    });

    it("returns --warning for middle range", () => {
      expect(benchmarkColor(0.5)).toBe("var(--warning)");
      expect(benchmarkColor(0.4)).toBe("var(--warning)");
      expect(benchmarkColor(0.6)).toBe("var(--warning)");
    });

    it("returns --foreground for undefined", () => {
      expect(benchmarkColor(undefined)).toBe("var(--foreground)");
    });
  });

  describe("buildPerPlayerData", () => {
    it("builds Recharts-compatible per-minute data from goldT arrays", () => {
      const players = [
        makePlayer({ playerSlot: 0, isRadiant: true, goldT: [0, 100, 200] }),
        makePlayer({ playerSlot: 128, isRadiant: false, goldT: [0, 150, 350] }),
      ];

      const data = buildPerPlayerData(players);
      expect(data).toHaveLength(3);
      expect(data[0]).toEqual({ minute: 0, player_0: 0, player_128: 0 });
      expect(data[1]).toEqual({ minute: 1, player_0: 100, player_128: 150 });
      expect(data[2]).toEqual({ minute: 2, player_0: 200, player_128: 350 });
    });

    it("returns empty array when no players have goldT", () => {
      const players = [
        makePlayer({ playerSlot: 0, goldT: null }),
        makePlayer({ playerSlot: 128, goldT: null }),
      ];

      const data = buildPerPlayerData(players);
      expect(data).toEqual([]);
    });
  });

  describe("LANE_LABELS", () => {
    it("maps lane numbers to labels", () => {
      expect(LANE_LABELS[1]).toBe("Bot");
      expect(LANE_LABELS[2]).toBe("Mid");
      expect(LANE_LABELS[3]).toBe("Top");
    });
  });
});
