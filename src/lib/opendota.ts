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

  // Identity & team
  personaname?: string;
  isRadiant?: boolean;
  level?: number;
  net_worth?: number;
  total_gold?: number;
  total_xp?: number;
  gold_spent?: number;

  // Extended items
  item_neutral?: number;
  backpack_0?: number;
  backpack_1?: number;
  backpack_2?: number;

  // Laning
  lane?: number;
  lane_role?: number;
  lane_efficiency?: number;
  is_roaming?: boolean;

  // Time-series (per-minute arrays)
  gold_t?: number[];
  xp_t?: number[];
  lh_t?: number[];
  dn_t?: number[];

  // Stats
  kda?: number;
  kills_per_min?: number;
  hero_kills?: number;
  tower_kills?: number;
  courier_kills?: number;
  observer_kills?: number;
  sentry_kills?: number;
  roshan_kills?: number;
  camps_stacked?: number;
  stuns?: number;
  actions_per_min?: number;
  teamfight_participation?: number;
  buyback_count?: number;
  obs_placed?: number;
  sen_placed?: number;
  rank_tier?: number;

  // Benchmarks
  benchmarks?: Record<string, { raw: number; pct: number }>;

  // Spatial
  lane_pos?: Record<string, Record<string, number>>;
  obs?: Record<string, Record<string, number>>;
  sen?: Record<string, Record<string, number>>;

  // Detailed logs
  kills_log?: Array<{ time: number; key: string }>;
  purchase_log?: Array<{ time: number; key: string }>;
  runes_log?: Array<{ time: number; key: string }>;
  ability_upgrades_arr?: number[];
  damage?: Record<string, number>;
  damage_targets?: Record<string, Record<string, number>>;
  damage_taken?: Record<string, number>;
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

  // Match-level stats
  radiant_score?: number;
  dire_score?: number;
  first_blood_time?: number;
  lobby_type?: number;
  patch?: number;

  // Advantage arrays (per-minute, Radiant - Dire)
  radiant_gold_adv?: number[];
  radiant_xp_adv?: number[];

  // Match events
  objectives?: Array<{
    time: number;
    type: string;
    key?: string;
    slot?: number;
    player_slot?: number;
    unit?: string;
    team?: number;
    value?: number;
  }>;
  teamfights?: Array<{
    start: number;
    end: number;
    last_death: number;
    deaths: number;
    players: Array<{
      deaths: number;
      buybacks: number;
      damage: number;
      healing: number;
      gold_delta: number;
      xp_delta: number;
    }>;
  }>;
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
