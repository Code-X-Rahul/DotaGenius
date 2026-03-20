"use client";

import Image from "next/image";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import type { PlayerData } from "@/lib/match-types";
import { getHero } from "@/lib/dota-constants";
import { getCsAt10, LANE_LABELS } from "@/lib/match-utils";

interface LaneCardProps {
  lane: number;
  radiantPlayers: PlayerData[];
  direPlayers: PlayerData[];
  focusSlot: number | null;
}

/** Color palettes for mini CS chart lines */
const RADIANT_COLORS = ["#22c55e", "#4ade80", "#86efac"];
const DIRE_COLORS = ["#ef4444", "#f87171", "#fca5a5"];

/**
 * Determine lane outcome by comparing combined lane efficiency.
 * Returns "radiant" | "dire" | "draw" | null (no data).
 */
function laneOutcome(
  radiant: PlayerData[],
  dire: PlayerData[]
): "radiant" | "dire" | "draw" | null {
  const rEff = radiant.reduce((sum, p) => sum + (p.laneEfficiency ?? 0), 0);
  const dEff = dire.reduce((sum, p) => sum + (p.laneEfficiency ?? 0), 0);
  if (rEff === 0 && dEff === 0) return null;
  const diff = rEff - dEff;
  if (Math.abs(diff) <= 0.05) return "draw";
  return diff > 0 ? "radiant" : "dire";
}

function OutcomeIndicator({ outcome }: { outcome: "radiant" | "dire" | "draw" | null }) {
  if (!outcome) return null;
  const config = {
    radiant: { label: "Radiant Won", color: "var(--success)" },
    dire: { label: "Dire Won", color: "var(--error)" },
    draw: { label: "Even", color: "var(--warning)" },
  }[outcome];
  return (
    <span className="text-xs font-semibold" style={{ color: config.color }}>
      {config.label}
    </span>
  );
}

function HeroIcon({ player }: { player: PlayerData }) {
  const hero = getHero(player.heroId);
  return (
    <div className="flex flex-col items-center gap-1">
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
      <span className="text-[10px] text-[var(--muted)] font-mono">
        CS@10: {getCsAt10(player.lhT)}
      </span>
    </div>
  );
}

/**
 * Build chart data for the mini CS line chart.
 * Returns an array of { minute, player_{slot}: lhValue } for minutes 0-10.
 */
function buildCsChartData(
  radiant: PlayerData[],
  dire: PlayerData[]
): Array<Record<string, number>> | null {
  const allPlayers = [...radiant, ...dire];
  const playersWithData = allPlayers.filter(
    (p) => p.lhT != null && p.lhT.length > 0
  );
  if (playersWithData.length === 0) return null;

  const points: Array<Record<string, number>> = [];
  for (let i = 0; i <= 10; i++) {
    const point: Record<string, number> = { minute: i };
    for (const p of playersWithData) {
      point[`p_${p.playerSlot}`] = p.lhT?.[i] ?? 0;
    }
    points.push(point);
  }
  return points;
}

export default function LaneCard({
  lane,
  radiantPlayers,
  direPlayers,
  focusSlot,
}: LaneCardProps) {
  const allPlayers = [...radiantPlayers, ...direPlayers];
  const hasFocusedPlayer = allPlayers.some((p) => p.playerSlot === focusSlot);
  const outcome = laneOutcome(radiantPlayers, direPlayers);
  const csData = buildCsChartData(radiantPlayers, direPlayers);

  return (
    <div
      className={`rounded-xl bg-[var(--card-bg)] border p-4 ${
        hasFocusedPlayer
          ? "border-[var(--accent)] shadow-[0_0_12px_rgba(59,130,246,0.15)]"
          : "border-[var(--card-border)]"
      }`}
    >
      {/* Lane label + outcome */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">
          {LANE_LABELS[lane] ?? `Lane ${lane}`}
        </h4>
        <OutcomeIndicator outcome={outcome} />
      </div>

      {/* Hero matchup */}
      <div className="flex items-center justify-center gap-3 mb-3">
        {/* Radiant side */}
        <div className="flex items-center gap-2">
          {radiantPlayers.length > 0 ? (
            radiantPlayers.map((p) => <HeroIcon key={p.playerSlot} player={p} />)
          ) : (
            <span className="text-xs text-[var(--muted)]">-</span>
          )}
        </div>

        <span className="text-xs text-[var(--muted)] font-semibold px-1">vs</span>

        {/* Dire side */}
        <div className="flex items-center gap-2">
          {direPlayers.length > 0 ? (
            direPlayers.map((p) => <HeroIcon key={p.playerSlot} player={p} />)
          ) : (
            <span className="text-xs text-[var(--muted)]">-</span>
          )}
        </div>
      </div>

      {/* Mini CS chart */}
      {csData ? (
        <div className="mt-2">
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={csData}>
              {radiantPlayers
                .filter((p) => p.lhT != null)
                .map((p, i) => (
                  <Line
                    key={`r-${p.playerSlot}`}
                    type="monotone"
                    dataKey={`p_${p.playerSlot}`}
                    stroke={RADIANT_COLORS[i % RADIANT_COLORS.length]}
                    dot={false}
                    strokeWidth={1.5}
                  />
                ))}
              {direPlayers
                .filter((p) => p.lhT != null)
                .map((p, i) => (
                  <Line
                    key={`d-${p.playerSlot}`}
                    type="monotone"
                    dataKey={`p_${p.playerSlot}`}
                    stroke={DIRE_COLORS[i % DIRE_COLORS.length]}
                    dot={false}
                    strokeWidth={1.5}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-2 flex items-center justify-center h-[80px] text-xs text-[var(--muted)]">
          No laning data
        </div>
      )}
    </div>
  );
}
