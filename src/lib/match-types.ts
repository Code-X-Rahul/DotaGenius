/**
 * TypeScript interfaces for match API response and component props.
 * Shared between API route serialization and frontend components.
 */

export interface PlayerData {
  heroId: number;
  playerSlot: number;
  accountId: string | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  goldPerMin: number | null;
  xpPerMin: number | null;
  lastHits: number | null;
  denies: number | null;
  heroDamage: number | null;
  towerDamage: number | null;
  heroHealing: number | null;
  items: number[];
  personaname: string | null;
  isRadiant: boolean | null;
  level: number | null;
  netWorth: number | null;
  itemNeutral: number | null;
  lane: number | null;
  laneRole: number | null;
  laneEfficiency: number | null;
  isRoaming: boolean | null;
  goldT: number[] | null;
  xpT: number[] | null;
  lhT: number[] | null;
  dnT: number[] | null;
  benchmarks: Record<string, { pct: number; raw: number }> | null;
  purchaseLog: Array<{ time: number; key: string }> | null;
  abilityUpgrades: Array<{ ability: number; time: number; level: number }> | null;
  damage: Record<string, number> | null;
  damageTaken: Record<string, number> | null;
  obsPlaced: number | null;
  senPlaced: number | null;
  runesLog: Array<{ time: number; key: number }> | null;
}

export interface MatchResponse {
  matchId: string;
  status: string;
  duration: number | null;
  startTime: number | null;
  gameMode: number | null;
  radiantWin: boolean | null;
  cluster: number | null;
  replayUrl: string | null;
  parsedAt: string | null;
  errorMsg: string | null;
  radiantScore: number | null;
  direScore: number | null;
  firstBloodTime: number | null;
  lobbyType: number | null;
  radiantGoldAdv: number[] | null;
  radiantXpAdv: number[] | null;
  objectives: ObjectiveEvent[] | null;
  players: PlayerData[];
}

export interface AdvantagePoint {
  minute: number;
  gold: number;
  xp: number;
}

export interface PerPlayerPoint {
  minute: number;
  [playerKey: string]: number;
}

export interface ObjectiveEvent {
  type: string;
  time: number;
  team?: number;
  key?: string;
  player_slot?: number;
}

export interface HeroInfo {
  id: number;
  name: string;
  img: string;
  icon: string;
}

export interface ItemInfo {
  id: number;
  name: string;
  img: string;
  cost: number;
}
