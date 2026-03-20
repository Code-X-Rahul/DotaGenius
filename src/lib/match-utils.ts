/**
 * Data transform utilities for match overview components.
 * Handles team splitting, CS@10 extraction, lane classification,
 * and Recharts-compatible data formatting.
 */
import type { PlayerData, AdvantagePoint, PerPlayerPoint } from "./match-types";

/**
 * Lane number to display label mapping.
 * OpenDota lane values: 1=bot, 2=mid, 3=top.
 */
export const LANE_LABELS: Record<number, string> = {
  1: "Bot",
  2: "Mid",
  3: "Top",
};

/**
 * Split players into Radiant and Dire teams, sorted by playerSlot.
 */
export function getTeamPlayers(players: PlayerData[]): {
  radiant: PlayerData[];
  dire: PlayerData[];
} {
  return {
    radiant: players
      .filter((p) => p.isRadiant)
      .sort((a, b) => a.playerSlot - b.playerSlot),
    dire: players
      .filter((p) => !p.isRadiant)
      .sort((a, b) => a.playerSlot - b.playerSlot),
  };
}

/**
 * Extract CS (last hits) at 10 minutes from the lhT time-series array.
 * Returns 0 if the array is null or shorter than 11 elements.
 */
export function getCsAt10(lhT: number[] | null): number {
  if (!lhT || lhT.length < 11) return 0;
  return lhT[10];
}

/**
 * Extract denies at 10 minutes from the dnT time-series array.
 * Returns 0 if the array is null or shorter than 11 elements.
 */
export function getDnAt10(dnT: number[] | null): number {
  if (!dnT || dnT.length < 11) return 0;
  return dnT[10];
}

/**
 * Group players into physical lanes (1=bot, 2=mid, 3=top) by team.
 * Excludes roaming players and players with invalid lane values.
 */
export function getLaneMatchups(players: PlayerData[]): Record<
  number,
  { radiant: PlayerData[]; dire: PlayerData[] }
> {
  const lanes: Record<number, { radiant: PlayerData[]; dire: PlayerData[] }> = {
    1: { radiant: [], dire: [] },
    2: { radiant: [], dire: [] },
    3: { radiant: [], dire: [] },
  };

  for (const p of players) {
    if (p.isRoaming || !p.lane || p.lane < 1 || p.lane > 3) continue;
    const team = p.isRadiant ? "radiant" : "dire";
    lanes[p.lane][team].push(p);
  }

  return lanes;
}

/**
 * Return players classified as roaming (isRoaming=true or invalid lane).
 */
export function getRoamingPlayers(players: PlayerData[]): PlayerData[] {
  return players.filter(
    (p) => p.isRoaming || !p.lane || p.lane < 1 || p.lane > 3
  );
}

/**
 * Convert parallel radiantGoldAdv/radiantXpAdv arrays into
 * Recharts-compatible AdvantagePoint[] format.
 * Returns empty array if both inputs are null.
 */
export function buildAdvantageData(
  goldAdv: number[] | null,
  xpAdv: number[] | null
): AdvantagePoint[] {
  const len = Math.max(goldAdv?.length ?? 0, xpAdv?.length ?? 0);
  if (len === 0) return [];
  return Array.from({ length: len }, (_, i) => ({
    minute: i,
    gold: goldAdv?.[i] ?? 0,
    xp: xpAdv?.[i] ?? 0,
  }));
}

/**
 * Build per-player gold-over-time data from goldT arrays.
 * Each point has { minute, player_{slot}: goldValue }.
 * Returns empty array if no players have goldT data.
 */
export function buildPerPlayerData(players: PlayerData[]): PerPlayerPoint[] {
  const playersWithGold = players.filter(
    (p) => p.goldT != null && p.goldT.length > 0
  );
  if (playersWithGold.length === 0) return [];

  const maxLen = Math.max(...playersWithGold.map((p) => p.goldT!.length));
  const result: PerPlayerPoint[] = [];

  for (let i = 0; i < maxLen; i++) {
    const point: PerPlayerPoint = { minute: i };
    for (const p of playersWithGold) {
      point[`player_${p.playerSlot}`] = p.goldT![i] ?? 0;
    }
    result.push(point);
  }

  return result;
}

/**
 * Returns a CSS custom property string for benchmark color coding.
 * Green (--success) for top 30%, red (--error) for bottom 30%, yellow (--warning) for average.
 */
export function benchmarkColor(pct: number | undefined): string {
  if (pct === undefined) return "var(--foreground)";
  if (pct >= 0.7) return "var(--success)";
  if (pct <= 0.3) return "var(--error)";
  return "var(--warning)";
}
