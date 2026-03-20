const OPENDOTA_BASE = "https://api.opendota.com/api";

export interface OpenDotaPlayer {
  hero_id: number;
  player_slot: number;
  account_id: number | null;
  kills: number;
  deaths: number;
  assists: number;
  gold_per_min: number;
  xp_per_min: number;
  last_hits: number;
  denies: number;
  hero_damage: number;
  tower_damage: number;
  hero_healing: number;
  item_0?: number;
  item_1?: number;
  item_2?: number;
  item_3?: number;
  item_4?: number;
  item_5?: number;
}

export interface OpenDotaMatch {
  match_id: number;
  duration: number;
  start_time: number;
  cluster: number;
  replay_url?: string;
  game_mode: number;
  radiant_win: boolean;
  players: OpenDotaPlayer[];
}

export async function getMatch(matchId: string): Promise<OpenDotaMatch> {
  const res = await fetch(`${OPENDOTA_BASE}/matches/${matchId}`);
  if (!res.ok) throw new Error(`OpenDota API error: ${res.status}`);
  return res.json();
}

export function isReplayLikelyExpired(startTime: number): boolean {
  const TEN_DAYS_SECONDS = 10 * 24 * 60 * 60;
  return Date.now() / 1000 - startTime > TEN_DAYS_SECONDS;
}
