import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Integration tests for the replay pipeline API endpoints.
 * These test the API route handler functions directly by importing them
 * and mocking external dependencies (queue, database).
 *
 * These do NOT require running services -- they mock Prisma and BullMQ.
 */

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    match: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock the queue
vi.mock("@/lib/queue", () => ({
  replayQueue: {
    add: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { replayQueue } from "@/lib/queue";

// Helper to create NextRequest-like objects
function createRequest(
  url: string,
  method: string = "GET"
): Request {
  return new Request(url, { method });
}

// Import route handlers directly
// Note: Next.js App Router handlers are just async functions
// We import them and call with (request, { params }) shape
import { GET, POST } from "@/app/api/matches/[matchId]/route";

describe("Replay Pipeline API - /api/matches/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/matches/:matchId", () => {
    it("should return 202 with jobId when queueing a new match", async () => {
      const mockPrismaMatch = prisma.match.findUnique as ReturnType<typeof vi.fn>;
      mockPrismaMatch.mockResolvedValue(null);

      const mockQueueAdd = replayQueue.add as ReturnType<typeof vi.fn>;
      mockQueueAdd.mockResolvedValue({ id: "replay-8123456789" });

      const req = createRequest(
        "http://localhost:3000/api/matches/8123456789",
        "POST"
      );
      const res = await POST(req as any, {
        params: Promise.resolve({ matchId: "8123456789" }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.jobId).toBe("replay-8123456789");
      expect(body.matchId).toBe("8123456789");
      expect(body.status).toBe("queued");
    });

    it("should return 200 with match data for already-complete match", async () => {
      const mockPrismaMatch = prisma.match.findUnique as ReturnType<typeof vi.fn>;
      mockPrismaMatch.mockResolvedValue({
        matchId: BigInt("8123456789"),
        status: "complete",
        duration: 2400,
        gameMode: 22,
        radiantWin: true,
        players: [
          {
            matchId: BigInt("8123456789"),
            playerSlot: 0,
            heroId: 1,
            accountId: BigInt("12345"),
          },
        ],
      });

      const req = createRequest(
        "http://localhost:3000/api/matches/8123456789",
        "POST"
      );
      const res = await POST(req as any, {
        params: Promise.resolve({ matchId: "8123456789" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("complete");
      expect(body.matchId).toBe("8123456789");
    });

    it("should return 202 when match is already being processed", async () => {
      const mockPrismaMatch = prisma.match.findUnique as ReturnType<typeof vi.fn>;
      mockPrismaMatch.mockResolvedValue({
        matchId: BigInt("8123456789"),
        status: "downloading",
      });

      const req = createRequest(
        "http://localhost:3000/api/matches/8123456789",
        "POST"
      );
      const res = await POST(req as any, {
        params: Promise.resolve({ matchId: "8123456789" }),
      });

      expect(res.status).toBe(202);
      const body = await res.json();
      expect(body.status).toBe("downloading");
      expect(body.message).toContain("already being processed");
    });

    it("should return 400 for invalid match ID", async () => {
      const req = createRequest(
        "http://localhost:3000/api/matches/abc",
        "POST"
      );
      const res = await POST(req as any, {
        params: Promise.resolve({ matchId: "abc" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });
  });

  describe("GET /api/matches/:matchId", () => {
    it("should return 404 for unknown match", async () => {
      const mockPrismaMatch = prisma.match.findUnique as ReturnType<typeof vi.fn>;
      mockPrismaMatch.mockResolvedValue(null);

      const req = createRequest(
        "http://localhost:3000/api/matches/8123456789"
      );
      const res = await GET(req as any, {
        params: Promise.resolve({ matchId: "8123456789" }),
      });

      expect(res.status).toBe(404);
    });

    it("should return match data for existing complete match", async () => {
      const mockPrismaMatch = prisma.match.findUnique as ReturnType<typeof vi.fn>;
      mockPrismaMatch.mockResolvedValue({
        matchId: BigInt("8123456789"),
        status: "complete",
        duration: 2400,
        startTime: new Date("2026-03-10T12:00:00Z"),
        gameMode: 22,
        radiantWin: true,
        cluster: 111,
        replayUrl: "https://replay.example.com/test.dem.bz2",
        parsedAt: new Date("2026-03-10T13:00:00Z"),
        errorMsg: null,
        players: [
          {
            heroId: 1,
            playerSlot: 0,
            accountId: BigInt("12345"),
            kills: 10,
            deaths: 3,
            assists: 15,
            goldPerMin: 500,
            xpPerMin: 600,
            lastHits: 200,
            denies: 10,
            heroDamage: 25000,
            towerDamage: 5000,
            heroHealing: 0,
            items: [1, 2, 3, 4, 5, 6],
          },
        ],
      });

      const req = createRequest(
        "http://localhost:3000/api/matches/8123456789"
      );
      const res = await GET(req as any, {
        params: Promise.resolve({ matchId: "8123456789" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.matchId).toBe("8123456789");
      expect(body.status).toBe("complete");
      expect(body.duration).toBe(2400);
      expect(body.players).toHaveLength(1);
      expect(body.players[0].kills).toBe(10);
    });

    it("should return 400 for invalid match ID", async () => {
      const req = createRequest(
        "http://localhost:3000/api/matches/xyz"
      );
      const res = await GET(req as any, {
        params: Promise.resolve({ matchId: "xyz" }),
      });

      expect(res.status).toBe(400);
    });
  });
});
