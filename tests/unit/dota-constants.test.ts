import { describe, it, expect } from "vitest";
import {
  getHero,
  getItem,
  getItemImage,
  getItemName,
  getLobbyTypeName,
  getRegionName,
} from "@/lib/dota-constants";

describe("dota-constants", () => {
  describe("getHero", () => {
    it("returns hero info for a known hero ID (Anti-Mage = 1)", () => {
      const hero = getHero(1);
      expect(hero).not.toBeNull();
      expect(hero!.id).toBe(1);
      expect(hero!.name).toBe("Anti-Mage");
      expect(hero!.img).toContain("cdn.cloudflare.steamstatic.com");
      expect(hero!.img).toContain("antimage");
      expect(hero!.icon).toContain("cdn.cloudflare.steamstatic.com");
    });

    it("returns null for unknown hero ID", () => {
      expect(getHero(99999)).toBeNull();
    });

    it("returns null for hero ID 0", () => {
      expect(getHero(0)).toBeNull();
    });
  });

  describe("getItem", () => {
    it("returns item info for Blink Dagger (id=1)", () => {
      const item = getItem(1);
      expect(item).not.toBeNull();
      expect(item!.id).toBe(1);
      expect(item!.name).toBe("Blink Dagger");
      expect(item!.img).toContain("cdn.cloudflare.steamstatic.com");
      expect(item!.cost).toBeGreaterThan(0);
    });

    it("returns null for item ID 0", () => {
      expect(getItem(0)).toBeNull();
    });

    it("returns null for unknown item ID", () => {
      expect(getItem(999999)).toBeNull();
    });
  });

  describe("getItemImage", () => {
    it("returns CDN image URL for known item", () => {
      const img = getItemImage(1);
      expect(img).not.toBeNull();
      expect(img).toContain("cdn.cloudflare.steamstatic.com");
    });

    it("returns null for unknown item", () => {
      expect(getItemImage(999999)).toBeNull();
    });
  });

  describe("getItemName", () => {
    it("returns 'Empty' for item ID 0", () => {
      expect(getItemName(0)).toBe("Empty");
    });

    it("returns item name for known item", () => {
      expect(getItemName(1)).toBe("Blink Dagger");
    });

    it("returns 'Unknown Item' for unknown item ID", () => {
      expect(getItemName(999999)).toBe("Unknown Item");
    });
  });

  describe("getLobbyTypeName", () => {
    it("returns name for known lobby type", () => {
      const name = getLobbyTypeName(0);
      expect(name).toBeTruthy();
      expect(typeof name).toBe("string");
    });

    it("returns 'Unknown' for invalid lobby type", () => {
      expect(getLobbyTypeName(99999)).toBe("Unknown");
    });
  });

  describe("getRegionName", () => {
    it("returns region name for known cluster", () => {
      // cluster 111 -> region 1 -> US WEST
      const name = getRegionName(111);
      expect(name).toBeTruthy();
      expect(typeof name).toBe("string");
    });

    it("returns empty string for unknown cluster", () => {
      expect(getRegionName(0)).toBe("");
    });
  });
});
