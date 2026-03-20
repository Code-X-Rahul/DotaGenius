import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const DATABASE_URL = process.env.DATABASE_URL;

describe.skipIf(!DATABASE_URL)(
  "Data Storage - PostgreSQL integration",
  () => {
    let prisma: PrismaClient;
    const testMatchId = BigInt("9999999999");

    beforeAll(() => {
      prisma = new PrismaClient();
    });

    afterEach(async () => {
      // Clean up test data in reverse dependency order
      await prisma.positionSnapshot.deleteMany({
        where: { matchId: testMatchId },
      });
      await prisma.combatLogEvent.deleteMany({
        where: { matchId: testMatchId },
      });
      await prisma.player.deleteMany({
        where: { matchId: testMatchId },
      });
      await prisma.match.deleteMany({
        where: { matchId: testMatchId },
      });
    });

    it("should create a Match record with all required fields", async () => {
      const match = await prisma.match.create({
        data: {
          matchId: testMatchId,
          duration: 2400,
          startTime: new Date("2026-03-10T12:00:00Z"),
          gameMode: 22,
          radiantWin: true,
          cluster: 111,
          status: "complete",
        },
      });

      expect(match.matchId).toBe(testMatchId);
      expect(match.duration).toBe(2400);
      expect(match.gameMode).toBe(22);
      expect(match.radiantWin).toBe(true);
      expect(match.status).toBe("complete");
    });

    it("should store Match with Players, CombatLogEvents, and PositionSnapshots in a transaction", async () => {
      await prisma.$transaction(async (tx) => {
        // Create match
        await tx.match.create({
          data: {
            matchId: testMatchId,
            duration: 1800,
            startTime: new Date("2026-03-10T12:00:00Z"),
            gameMode: 1,
            radiantWin: false,
            cluster: 222,
            status: "complete",
            parsedAt: new Date(),
          },
        });

        // Create 10 players (5 radiant, 5 dire)
        for (let i = 0; i < 10; i++) {
          await tx.player.create({
            data: {
              matchId: testMatchId,
              playerSlot: i < 5 ? i : i + 123, // Dire slots start at 128
              heroId: i + 1,
              kills: Math.floor(Math.random() * 20),
              deaths: Math.floor(Math.random() * 10),
              assists: Math.floor(Math.random() * 30),
              goldPerMin: 300 + i * 50,
              xpPerMin: 400 + i * 40,
              lastHits: 100 + i * 30,
              denies: i * 3,
              heroDamage: 10000 + i * 2000,
              towerDamage: 500 + i * 200,
              heroHealing: i * 1000,
              items: [1, 2, 3, 4, 5, 6],
            },
          });
        }

        // Create combat log events
        await tx.combatLogEvent.createMany({
          data: [
            {
              matchId: testMatchId,
              gameTime: 120,
              eventType: "damage",
              attackerHero: "npc_dota_hero_axe",
              targetHero: "npc_dota_hero_crystal_maiden",
              value: 150,
              isAttackerHero: true,
              isTargetHero: true,
            },
            {
              matchId: testMatchId,
              gameTime: 300,
              eventType: "kill",
              attackerHero: "npc_dota_hero_axe",
              targetHero: "npc_dota_hero_crystal_maiden",
              value: null,
              isAttackerHero: true,
              isTargetHero: true,
            },
          ],
        });

        // Create position snapshots
        await tx.positionSnapshot.createMany({
          data: [
            {
              matchId: testMatchId,
              gameTime: 60,
              heroId: 1,
              x: 100.5,
              y: 200.3,
              gold: 500,
              xp: 300,
            },
            {
              matchId: testMatchId,
              gameTime: 120,
              heroId: 1,
              x: 150.2,
              y: 180.7,
              gold: 800,
              xp: 600,
            },
          ],
        });
      });

      // Verify all records
      const match = await prisma.match.findUnique({
        where: { matchId: testMatchId },
        include: {
          players: true,
          combatLogEvents: true,
          positionSnapshots: true,
        },
      });

      expect(match).not.toBeNull();
      expect(match!.players).toHaveLength(10);
      expect(match!.combatLogEvents).toHaveLength(2);
      expect(match!.positionSnapshots).toHaveLength(2);
      expect(match!.status).toBe("complete");
      expect(match!.parsedAt).toBeInstanceOf(Date);
    });

    it("should enforce unique constraint on matchId", async () => {
      await prisma.match.create({
        data: {
          matchId: testMatchId,
          duration: 1800,
          startTime: new Date(),
          gameMode: 1,
          radiantWin: true,
          cluster: 111,
          status: "pending",
        },
      });

      await expect(
        prisma.match.create({
          data: {
            matchId: testMatchId,
            duration: 2000,
            startTime: new Date(),
            gameMode: 2,
            radiantWin: false,
            cluster: 222,
            status: "pending",
          },
        })
      ).rejects.toThrow();
    });

    it("should enforce unique constraint on matchId + playerSlot", async () => {
      await prisma.match.create({
        data: {
          matchId: testMatchId,
          duration: 1800,
          startTime: new Date(),
          gameMode: 1,
          radiantWin: true,
          cluster: 111,
          status: "pending",
        },
      });

      await prisma.player.create({
        data: {
          matchId: testMatchId,
          playerSlot: 0,
          heroId: 1,
          goldPerMin: 300,
          xpPerMin: 400,
          lastHits: 100,
          denies: 5,
          heroDamage: 10000,
          towerDamage: 500,
          heroHealing: 0,
          items: [1, 2, 3, 4, 5, 6],
        },
      });

      await expect(
        prisma.player.create({
          data: {
            matchId: testMatchId,
            playerSlot: 0,
            heroId: 2,
            goldPerMin: 400,
            xpPerMin: 500,
            lastHits: 200,
            denies: 10,
            heroDamage: 20000,
            towerDamage: 1000,
            heroHealing: 500,
            items: [7, 8, 9, 10, 11, 12],
          },
        })
      ).rejects.toThrow();
    });
  }
);
