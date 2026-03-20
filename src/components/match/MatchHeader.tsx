"use client";

import Image from "next/image";
import type { MatchResponse } from "@/lib/match-types";
import { getHero, getLobbyTypeName, getRegionName } from "@/lib/dota-constants";

const GAME_MODES: Record<number, string> = {
  0: "Unknown",
  1: "All Pick",
  2: "Captain's Mode",
  3: "Random Draft",
  4: "Single Draft",
  5: "All Random",
  12: "Least Played",
  16: "Captain's Draft",
  18: "Ability Draft",
  22: "Ranked All Pick",
  23: "Turbo",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(startTime: number): string {
  return new Date(startTime * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MatchHeaderProps {
  match: MatchResponse;
}

export default function MatchHeader({ match }: MatchHeaderProps) {
  const radiantPlayers = match.players
    .filter((p) => p.isRadiant)
    .sort((a, b) => a.playerSlot - b.playerSlot);
  const direPlayers = match.players
    .filter((p) => !p.isRadiant)
    .sort((a, b) => a.playerSlot - b.playerSlot);

  const radiantWin = match.radiantWin === true;

  return (
    <div className="rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] p-6">
      {/* Hero portrait strip with score */}
      <div className="flex items-center justify-center gap-3">
        {/* Radiant heroes */}
        <div
          className="flex items-center gap-1.5"
          style={
            radiantWin
              ? { filter: "drop-shadow(0 0 8px rgba(34, 197, 94, 0.4))" }
              : undefined
          }
        >
          {radiantPlayers.map((player) => {
            const hero = getHero(player.heroId);
            return (
              <div
                key={player.playerSlot}
                className="w-10 h-10 rounded-md overflow-hidden bg-[var(--card-border)] flex-shrink-0"
                title={hero?.name ?? `Hero ${player.heroId}`}
              >
                {hero ? (
                  <Image
                    src={hero.icon}
                    alt={hero.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)]">
                    ?
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Score */}
        <div className="flex items-center gap-2 px-4">
          <span
            className="text-2xl font-bold"
            style={{ color: radiantWin ? "var(--success)" : "var(--muted)" }}
          >
            {match.radiantScore ?? 0}
          </span>
          <span className="text-[var(--muted)] text-lg">-</span>
          <span
            className="text-2xl font-bold"
            style={{ color: !radiantWin ? "var(--error)" : "var(--muted)" }}
          >
            {match.direScore ?? 0}
          </span>
        </div>

        {/* Dire heroes */}
        <div
          className="flex items-center gap-1.5"
          style={
            !radiantWin
              ? { filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.4))" }
              : undefined
          }
        >
          {direPlayers.map((player) => {
            const hero = getHero(player.heroId);
            return (
              <div
                key={player.playerSlot}
                className="w-10 h-10 rounded-md overflow-hidden bg-[var(--card-border)] flex-shrink-0"
                title={hero?.name ?? `Hero ${player.heroId}`}
              >
                {hero ? (
                  <Image
                    src={hero.icon}
                    alt={hero.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)]">
                    ?
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Winner label */}
      <div className="text-center mt-3">
        <span
          className="text-sm font-semibold"
          style={{ color: radiantWin ? "var(--success)" : "var(--error)" }}
        >
          {radiantWin ? "Radiant Victory" : "Dire Victory"}
        </span>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 text-sm text-[var(--muted)]">
        <span className="font-mono">#{match.matchId}</span>
        {match.cluster != null && (
          <span>{getRegionName(match.cluster)}</span>
        )}
        {match.startTime != null && (
          <span>{formatDate(match.startTime)}</span>
        )}
        {match.lobbyType != null && (
          <span>{getLobbyTypeName(match.lobbyType)}</span>
        )}
        {match.duration != null && (
          <span className="text-[var(--foreground)] font-semibold text-base">
            {formatDuration(match.duration)}
          </span>
        )}
        {match.gameMode != null && (
          <span className="text-[var(--foreground)] font-semibold text-base">
            {GAME_MODES[match.gameMode] ?? `Mode ${match.gameMode}`}
          </span>
        )}
      </div>
    </div>
  );
}
