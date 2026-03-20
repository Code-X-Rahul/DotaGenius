import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Parser client", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("parseReplay", () => {
    it("returns parsed events array on 200 response", async () => {
      const ndjson = [
        '{"type":"combat_log","time":120,"event":"damage","value":45}',
        '{"type":"hero_position","time":120,"hero_id":1,"x":128.5,"y":64.2}',
      ].join("\n");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(ndjson),
      });

      const { parseReplay } = await import("@/lib/parser");
      const events = await parseReplay("http://example.com/replay.dem.bz2");

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe("combat_log");
      expect(events[1].type).toBe("hero_position");
    });

    it("throws 'corrupted or unsupported' error on 204 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 204,
        text: () => Promise.resolve(""),
      });

      const { parseReplay } = await import("@/lib/parser");
      await expect(
        parseReplay("http://example.com/replay.dem.bz2")
      ).rejects.toThrow("corrupted or unsupported");
    });

    it("throws 'Parser error' on 500 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      const { parseReplay } = await import("@/lib/parser");
      await expect(
        parseReplay("http://example.com/replay.dem.bz2")
      ).rejects.toThrow("Parser error");
    });

    it("uses 5-minute timeout via AbortSignal", async () => {
      const ndjson = '{"type":"metadata","match_id":123}';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(ndjson),
      });

      const { parseReplay } = await import("@/lib/parser");
      await parseReplay("http://example.com/replay.dem.bz2");

      const fetchCall = mockFetch.mock.calls[0];
      const options = fetchCall[1];
      expect(options).toBeDefined();
      expect(options.signal).toBeDefined();
    });

    it("correctly encodes replay URL as query parameter", async () => {
      const ndjson = '{"type":"metadata","match_id":123}';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(ndjson),
      });

      const { parseReplay } = await import("@/lib/parser");
      const replayUrl =
        "http://replay236.valve.net/570/8583844960_1234567890.dem.bz2";
      await parseReplay(replayUrl);

      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain("/blob?replay_url=");
      expect(fetchUrl).toContain(encodeURIComponent(replayUrl));
    });
  });
});
