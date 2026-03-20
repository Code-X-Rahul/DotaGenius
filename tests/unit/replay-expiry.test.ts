import { describe, it, expect, vi, afterEach } from "vitest";

describe("isReplayLikelyExpired", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true for start_time > 10 days ago", async () => {
    const now = Date.now();
    // 11 days ago in seconds
    const startTime = now / 1000 - 11 * 24 * 60 * 60;

    vi.spyOn(Date, "now").mockReturnValue(now);

    const { isReplayLikelyExpired } = await import("@/lib/opendota");
    expect(isReplayLikelyExpired(startTime)).toBe(true);
  });

  it("returns false for recent match (less than 10 days)", async () => {
    const now = Date.now();
    // 5 days ago in seconds
    const startTime = now / 1000 - 5 * 24 * 60 * 60;

    vi.spyOn(Date, "now").mockReturnValue(now);

    const { isReplayLikelyExpired } = await import("@/lib/opendota");
    expect(isReplayLikelyExpired(startTime)).toBe(false);
  });

  it("returns false for a match exactly at the 10-day boundary", async () => {
    const now = Date.now();
    // Exactly 10 days ago
    const startTime = now / 1000 - 10 * 24 * 60 * 60;

    vi.spyOn(Date, "now").mockReturnValue(now);

    const { isReplayLikelyExpired } = await import("@/lib/opendota");
    // At exactly 10 days, should NOT be expired (boundary condition)
    expect(isReplayLikelyExpired(startTime)).toBe(false);
  });
});
