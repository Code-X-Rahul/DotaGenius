/**
 * Dota 2 constants lookup module.
 * Wraps the dotaconstants package with typed functions and CDN image URLs.
 */
import { heroes, items, lobby_type, cluster, region } from "dotaconstants";
import type { HeroInfo, ItemInfo } from "./match-types";

const CDN_BASE = "https://cdn.cloudflare.steamstatic.com";

const heroesMap = heroes as Record<string, {
  id: number;
  name: string;
  localized_name: string;
  img: string;
  icon: string;
}>;

const itemsMap = items as unknown as Record<string, {
  id: number;
  dname?: string;
  img?: string;
  cost?: number | null;
}>;

const lobbyTypeMap = lobby_type as Record<string, { id: number; name: string }>;
const clusterMap = cluster as Record<string, number>;
const regionMap = region as Record<string, string>;

// Build inverted index: item numeric ID -> item data (O(n) once, O(1) lookups)
const itemById: Record<number, { dname: string; img: string; cost: number; id: number }> = {};
for (const item of Object.values(itemsMap)) {
  if (item.id != null && item.id > 0) {
    itemById[item.id] = {
      id: item.id,
      dname: item.dname ?? "Unknown Item",
      img: item.img ?? "",
      cost: item.cost ?? 0,
    };
  }
}

/**
 * Look up hero by numeric ID.
 * Returns hero info with full CDN image URLs, or null if not found.
 */
export function getHero(heroId: number): HeroInfo | null {
  const hero = heroesMap[String(heroId)];
  if (!hero) return null;
  return {
    id: hero.id,
    name: hero.localized_name,
    img: `${CDN_BASE}${hero.img}`,
    icon: `${CDN_BASE}${hero.icon}`,
  };
}

/**
 * Look up item by numeric ID.
 * Returns item info with full CDN image URL, or null for ID 0 or not found.
 */
export function getItem(itemId: number): ItemInfo | null {
  if (itemId === 0) return null;
  const item = itemById[itemId];
  if (!item) return null;
  return {
    id: item.id,
    name: item.dname,
    img: `${CDN_BASE}${item.img}`,
    cost: item.cost,
  };
}

/**
 * Shorthand for getItem(id)?.img -- returns CDN image URL or null.
 */
export function getItemImage(itemId: number): string | null {
  return getItem(itemId)?.img ?? null;
}

/**
 * Returns display name for an item ID.
 * Returns "Empty" for ID 0, "Unknown Item" for unrecognized IDs.
 */
export function getItemName(itemId: number): string {
  if (itemId === 0) return "Empty";
  return itemById[itemId]?.dname ?? "Unknown Item";
}

/**
 * Returns display name for a lobby type ID.
 * Strips "lobby_type_" prefix and title-cases the result.
 */
export function getLobbyTypeName(lobbyType: number): string {
  const entry = lobbyTypeMap[String(lobbyType)];
  if (!entry) return "Unknown";
  // Names are like "lobby_type_normal" -- clean up for display
  return entry.name
    .replace("lobby_type_", "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Returns region name for a cluster ID.
 * Maps cluster -> region ID via dotaconstants cluster.json, then region ID -> name.
 */
export function getRegionName(clusterId: number): string {
  const regionId = clusterMap[String(clusterId)];
  if (regionId == null) return "";
  return regionMap[String(regionId)] ?? "";
}
