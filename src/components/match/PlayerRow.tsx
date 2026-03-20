"use client";

import { useState } from "react";
import Image from "next/image";
import type { PlayerData } from "@/lib/match-types";
import { getHero, getItemImage, getItemName } from "@/lib/dota-constants";
import { benchmarkColor } from "@/lib/match-utils";
import PlayerDetail from "./PlayerDetail";

interface PlayerRowProps {
  player: PlayerData;
  isFocused: boolean;
  onFocus: () => void;
  radiantWin: boolean;
}

function StatCell({
  value,
  benchmarkKey,
  benchmarks,
}: {
  value: number | null;
  benchmarkKey?: string;
  benchmarks: Record<string, { pct: number; raw: number }> | null;
}) {
  const display = value != null ? value.toLocaleString() : "-";
  const color =
    benchmarkKey && benchmarks?.[benchmarkKey]
      ? benchmarkColor(benchmarks[benchmarkKey].pct)
      : undefined;
  return (
    <td
      className="px-2 py-1.5 text-right text-sm font-mono tabular-nums"
      style={color ? { color } : undefined}
    >
      {display}
    </td>
  );
}

function ItemSlot({ itemId }: { itemId: number }) {
  const imgUrl = getItemImage(itemId);
  const name = getItemName(itemId);
  return (
    <div
      className="w-7 h-5 rounded-sm overflow-hidden bg-[var(--card-border)] flex-shrink-0"
      title={name}
    >
      {imgUrl ? (
        <Image
          src={imgUrl}
          alt={name}
          width={28}
          height={20}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full" />
      )}
    </div>
  );
}

export default function PlayerRow({
  player,
  isFocused,
  onFocus,
  radiantWin,
}: PlayerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const hero = getHero(player.heroId);

  const kills = player.kills ?? 0;
  const deaths = player.deaths ?? 0;
  const assists = player.assists ?? 0;

  return (
    <>
      <tr
        className={`border-b border-[var(--card-border)] hover:bg-white/[0.02] cursor-pointer transition-colors ${
          isFocused ? "bg-[var(--accent-glow)] border-l-2 border-l-[var(--accent)]" : ""
        }`}
        onClick={onFocus}
      >
        {/* Hero icon + name */}
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-2 min-w-[140px]">
            <div className="w-8 h-8 rounded overflow-hidden bg-[var(--card-border)] flex-shrink-0">
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
            <span className="text-sm font-medium truncate max-w-[100px]">
              {hero?.name ?? `Hero ${player.heroId}`}
            </span>
          </div>
        </td>

        {/* Player name */}
        <td className="px-2 py-1.5 text-sm truncate max-w-[100px]">
          {player.personaname ?? "Anonymous"}
        </td>

        {/* Level */}
        <td className="px-2 py-1.5 text-center text-sm font-mono">
          {player.level ?? "-"}
        </td>

        {/* K/D/A */}
        <td className="px-2 py-1.5 text-center text-sm font-mono whitespace-nowrap">
          <span className="text-[var(--success)]">{kills}</span>
          <span className="text-[var(--muted)]">/</span>
          <span className="text-[var(--error)]">{deaths}</span>
          <span className="text-[var(--muted)]">/</span>
          <span>{assists}</span>
        </td>

        {/* LH/DN */}
        <td className="px-2 py-1.5 text-center text-sm font-mono whitespace-nowrap">
          {player.lastHits ?? 0}
          <span className="text-[var(--muted)]">/</span>
          {player.denies ?? 0}
        </td>

        {/* GPM */}
        <StatCell
          value={player.goldPerMin}
          benchmarkKey="gold_per_min"
          benchmarks={player.benchmarks}
        />

        {/* XPM */}
        <StatCell
          value={player.xpPerMin}
          benchmarkKey="xp_per_min"
          benchmarks={player.benchmarks}
        />

        {/* Net Worth */}
        <StatCell value={player.netWorth} benchmarks={player.benchmarks} />

        {/* Hero Damage */}
        <StatCell
          value={player.heroDamage}
          benchmarkKey="hero_damage"
          benchmarks={player.benchmarks}
        />

        {/* Tower Damage */}
        <StatCell
          value={player.towerDamage}
          benchmarkKey="tower_damage"
          benchmarks={player.benchmarks}
        />

        {/* Healing */}
        <StatCell
          value={player.heroHealing}
          benchmarkKey="hero_healing"
          benchmarks={player.benchmarks}
        />

        {/* Items */}
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-0.5">
            {player.items.map((itemId, idx) => (
              <ItemSlot key={`item-${idx}`} itemId={itemId} />
            ))}
            {player.itemNeutral != null && player.itemNeutral > 0 && (
              <>
                <div className="w-px h-4 bg-[var(--card-border)] mx-0.5" />
                <ItemSlot itemId={player.itemNeutral} />
              </>
            )}
          </div>
        </td>

        {/* Expand toggle */}
        <td className="px-2 py-1.5 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1"
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </td>
      </tr>

      {/* Expanded detail panel */}
      {expanded && (
        <tr>
          <td colSpan={13}>
            <PlayerDetail player={player} />
          </td>
        </tr>
      )}
    </>
  );
}
