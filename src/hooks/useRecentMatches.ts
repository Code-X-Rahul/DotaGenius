"use client";

const STORAGE_KEY = "dotagenius_recent";
const MAX_ENTRIES = 20;

export interface RecentMatchEntry {
  matchId: string;
  heroName?: string;
  timestamp: number;
  result?: "win" | "loss";
}

function getStorage(): RecentMatchEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentMatchEntry[];
  } catch {
    return [];
  }
}

function setStorage(entries: RecentMatchEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full or unavailable
  }
}

export function getRecent(): RecentMatchEntry[] {
  return getStorage();
}

export function addRecent(matchId: string, heroName?: string): void {
  const entries = getStorage();
  // Remove existing entry for this match if present
  const filtered = entries.filter((e) => e.matchId !== matchId);
  // Add new entry at the front
  filtered.unshift({
    matchId,
    heroName,
    timestamp: Date.now(),
  });
  // Keep only the last MAX_ENTRIES
  setStorage(filtered.slice(0, MAX_ENTRIES));
}
