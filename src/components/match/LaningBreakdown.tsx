"use client";

import Image from "next/image";
import type { PlayerData } from "@/lib/match-types";
import { getHero } from "@/lib/dota-constants";
import { getLaneMatchups, getRoamingPlayers } from "@/lib/match-utils";
import LaneCard from "./LaneCard";

interface LaningBreakdownProps {
  players: PlayerData[];
  focusSlot: number | null;
}

export default function LaningBreakdown({
  players,
  focusSlot,
}: LaningBreakdownProps) {
  const lanes = getLaneMatchups(players);
  const roamers = getRoamingPlayers(players);

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-[var(--foreground)]">
          Laning Phase
        </h3>
        <p className="text-xs text-[var(--muted)]">First 10 minutes</p>
      </div>

      {/* Three lane cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[3, 2, 1].map((laneNum) => (
          <LaneCard
            key={laneNum}
            lane={laneNum}
            radiantPlayers={lanes[laneNum]?.radiant ?? []}
            direPlayers={lanes[laneNum]?.dire ?? []}
            focusSlot={focusSlot}
          />
        ))}
      </div>

      {/* Roaming / Jungle section */}
      {roamers.length > 0 && (
        <div className="mt-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] p-4">
          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-3">
            Roaming / Jungle
          </h4>
          <div className="flex flex-wrap gap-4">
            {roamers.map((player) => {
              const hero = getHero(player.heroId);
              const isFocused = player.playerSlot === focusSlot;
              return (
                <div
                  key={player.playerSlot}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                    isFocused
                      ? "bg-[var(--accent-glow)] border border-[var(--accent)]"
                      : "bg-white/[0.02]"
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded overflow-hidden bg-[var(--card-border)] flex-shrink-0"
                    title={hero?.name ?? `Hero ${player.heroId}`}
                  >
                    {hero ? (
                      <Image
                        src={hero.icon}
                        alt={hero.name}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--muted)]">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {hero?.name ?? `Hero ${player.heroId}`}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {player.personaname ?? "Anonymous"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
