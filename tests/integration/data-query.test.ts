import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)(
  "Data Query - PostgreSQL integration",
  () => {
    let prisma: PrismaClient;
    const testMatchId = BigInt("9999999998");

    beforeAll(async () => {
      prisma = new PrismaClient();

      // Seed test data
      await prisma.match.create({
        data: {
          matchId: testMatchId,
          duration: 2400,
          startTime: new Date("2026-03-10T12:00:00Z"),
          gameMode: 22,
          radiantWin: true,
          cluster: 111,
          status: "complete",
          parsedAt: new Date(),
        },
      });

      // Create 3 players
      for (let i = 0; i < 3; i++) {
        await prisma.player.create({
          data: {
            matchId: testMatchId,
            playerSlot: i,
            heroId: i + 1,
            kills: i * 5,
            deaths: i * 2,
            assists: i * 8,
            goldPerMin: 300 + i * 100,
            xpPerMin: 400 + i * 80,
            lastHits: 100 + i * 50,
            denies: i * 5,
            heroDamage: 10000 + i * 5000,
            towerDamage: 500 + i * 300,
            heroHealing: i * 1000,
            items: [1, 2, 3, 4, 5, 6],
          },
        });
      }

      // Create combat log events at various game times
      await prisma.combatLogEvent.createMany({
        data: [
          {
            matchId: testMatchId,
            gameTime: 60,
            eventType: "damage",
            attackerHero: "npc_dota_hero_axe",
            targetHero: "npc_dota_hero_cm",
            value: 100,
            isAttackerHero: true,
            isTargetHero: true,
          },
          {
            matchId: testMatchId,
            gameTime: 180,
            eventType: "kill",
            attackerHero: "npc_dota_hero_axe",
            targetHero: "npc_dota_hero_cm",
            value: null,
            isAttackerHero: true,
            isTargetHero: true,
          },
          {
            matchId: testMatchId,
            gameTime: 600,
            eventType: "damage",
            attackerHero: "npc_dota_hero_sf",
            targetHero: "npc_dota_hero_axe",
            value: 250,
            isAttackerHero: true,
            isTargetHero: true,
          },
        ],
      });

      // Create position snapshots for different heroes
      await prisma.positionSnapshot.createMany({
        data: [
          { matchId: testMatchId, gameTime: 60, heroId: 1, x: 100.0, y: 200.0, gold: 500, xp: 300 },
          { matchId: testMatchId, gameTime: 120, heroId: 1, x: 120.0, y: 210.0, gold: 800, xp: 500 },
          { matchId: testMatchId, gameTime: 60, heroId: 2, x: 300.0, y: 400.0, gold: 450, xp: 280 },
          { matchId: testMatchId, gameTime: 120, heroId: 2, x: 310.0, y: 420.0, gold: 700, xp: 450 },
        ],
      });
    });

    afterAll(async () => {
      await prisma.positionSnapshot.deleteMany({ where: { matchId: testMatchId } });
      await prisma.combatLogEvent.deleteMany({ where: { matchId: testMatchId } });
      await prisma.player.deleteMany({ where: { matchId: testMatchId } });
      await prisma.match.deleteMany({ where: { matchId: testMatchId } });
      await prisma.$disconnect();
    });

    it("should query match by matchId with players included", async () => {
      const match = await prisma.match.findUnique({
        where: { matchId: testMatchId },
        include: { players: true },
      });

      expect(match).not.toBeNull();
      expect(match!.matchId).toBe(testMatchId);
      expect(match!.status).toBe("complete");
      expect(match!.players).toHaveLength(3);
      expect(match!.players[0].heroId).toBeGreaterThan(0);
    });

    it("should query combat_log_events by matchId and gameTime range", async () => {
      const events = await prisma.combatLogEvent.findMany({
        where: {
          matchId: testMatchId,
          gameTime: { gte: 50, lte: 200 },
        },
        orderBy: { gameTime: "asc" },
      });

      expect(events).toHaveLength(2);
      expect(events[0].gameTime).toBe(60);
      expect(events[1].gameTime).toBe(180);
    });

    it("should query position_snapshots by matchId and heroId", async () => {
      const snapshots = await prisma.positionSnapshot.findMany({
        where: {
          matchId: testMatchId,
          heroId: 1,
        },
        orderBy: { gameTime: "asc" },
      });

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].gameTime).toBe(60);
      expect(snapshots[1].gameTime).toBe(120);
      expect(snapshots[0].x).toBeCloseTo(100.0);
    });

    it("should query combat_log_events by eventType", async () => {
      const kills = await prisma.combatLogEvent.findMany({
        where: {
          matchId: testMatchId,
          eventType: "kill",
        },
      });

      expect(kills).toHaveLength(1);
      expect(kills[0].gameTime).toBe(180);
    });
  }
);
