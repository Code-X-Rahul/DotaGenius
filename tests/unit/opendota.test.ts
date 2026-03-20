import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("OpenDota client", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getMatch", () => {
    it("fetches from correct URL and returns typed response", async () => {
      const matchData = {
        match_id: 8583844960,
        duration: 2847,
        start_time: 1710000000,
        cluster: 236,
        replay_url:
          "http://replay236.valve.net/570/8583844960_1234567890.dem.bz2",
        game_mode: 22,
        radiant_win: true,
        players: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(matchData),
      });

      const { getMatch } = await import("@/lib/opendota");
      const result = await getMatch("8583844960");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.opendota.com/api/matches/8583844960"
      );
      expect(result.match_id).toBe(8583844960);
      expect(result.duration).toBe(2847);
      expect(result.cluster).toBe(236);
      expect(result.replay_url).toBeDefined();
      expect(result.players).toBeDefined();
    });

    it("throws on non-200 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { getMatch } = await import("@/lib/opendota");
      await expect(getMatch("9999999999")).rejects.toThrow(
        "OpenDota API error: 404"
      );
    });

    it("handles missing replay_url field", async () => {
      const matchData = {
        match_id: 8583844960,
        duration: 2847,
        start_time: 1710000000,
        cluster: 236,
        game_mode: 22,
        radiant_win: true,
        players: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(matchData),
      });

      const { getMatch } = await import("@/lib/opendota");
      const result = await getMatch("8583844960");

      expect(result.replay_url).toBeUndefined();
    });
  });
});
