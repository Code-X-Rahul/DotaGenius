import { describe, it, expect } from "vitest";

describe("constructReplayUrl", () => {
  it("formats URL correctly from cluster, matchId, and replaySalt", async () => {
    const { constructReplayUrl } = await import("@/lib/replay-url");
    const url = constructReplayUrl("8583844960", 236, 1234567890);
    expect(url).toBe(
      "http://replay236.valve.net/570/8583844960_1234567890.dem.bz2"
    );
  });

  it("handles different cluster numbers", async () => {
    const { constructReplayUrl } = await import("@/lib/replay-url");
    const url = constructReplayUrl("1234567890", 111, 9876543210);
    expect(url).toBe(
      "http://replay111.valve.net/570/1234567890_9876543210.dem.bz2"
    );
  });
});
