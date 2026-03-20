import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Parsed event structure", () => {
  const fixturePath = join(__dirname, "../fixtures/parser-output.ndjson");
  const lines = readFileSync(fixturePath, "utf-8").trim().split("\n");
  const events = lines.map((line) => JSON.parse(line));

  it("each line parses to valid JSON with a type field", () => {
    for (const event of events) {
      expect(event).toBeDefined();
      expect(typeof event.type).toBe("string");
      expect(event.type.length).toBeGreaterThan(0);
    }
  });

  it("combat_log events contain expected fields", () => {
    const combatEvents = events.filter((e) => e.type === "combat_log");
    expect(combatEvents.length).toBeGreaterThan(0);

    for (const event of combatEvents) {
      expect(event.time).toBeDefined();
      expect(typeof event.time).toBe("number");
      // At least one of the key combat log fields should be present
      const hasCombatFields =
        event.attackername !== undefined ||
        event.targetname !== undefined ||
        event.inflictor !== undefined ||
        event.value !== undefined;
      expect(hasCombatFields).toBe(true);
    }
  });

  it("hero_position events contain required position fields", () => {
    const positionEvents = events.filter((e) => e.type === "hero_position");
    expect(positionEvents.length).toBeGreaterThan(0);

    for (const event of positionEvents) {
      expect(typeof event.time).toBe("number");
      expect(typeof event.hero_id).toBe("number");
      expect(typeof event.x).toBe("number");
      expect(typeof event.y).toBe("number");
    }
  });

  it("hero_position events include gold and xp", () => {
    const positionEvents = events.filter((e) => e.type === "hero_position");
    for (const event of positionEvents) {
      expect(typeof event.gold).toBe("number");
      expect(typeof event.xp).toBe("number");
    }
  });

  describe("ndjson parser utility", () => {
    it("correctly splits and parses multi-line ndjson", async () => {
      const { parseNdjson } = await import("@/lib/parser");
      const ndjson = [
        '{"type":"combat_log","time":100}',
        '{"type":"hero_position","time":200}',
        '{"type":"metadata","match_id":123}',
      ].join("\n");

      const result = parseNdjson(ndjson);
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe("combat_log");
      expect(result[1].type).toBe("hero_position");
      expect(result[2].type).toBe("metadata");
    });

    it("skips malformed ndjson lines gracefully", async () => {
      const { parseNdjson } = await import("@/lib/parser");
      const ndjson = [
        '{"type":"combat_log","time":100}',
        "not valid json {{{",
        '{"type":"metadata","match_id":123}',
      ].join("\n");

      const result = parseNdjson(ndjson);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("combat_log");
      expect(result[1].type).toBe("metadata");
    });

    it("handles empty input", async () => {
      const { parseNdjson } = await import("@/lib/parser");
      const result = parseNdjson("");
      expect(result).toHaveLength(0);
    });
  });
});
