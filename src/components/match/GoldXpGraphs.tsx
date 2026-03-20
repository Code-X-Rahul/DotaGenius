"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MatchResponse, ObjectiveEvent } from "@/lib/match-types";
import { getHero } from "@/lib/dota-constants";
import { buildAdvantageData, buildPerPlayerData } from "@/lib/match-utils";

interface GoldXpGraphsProps {
  match: MatchResponse;
}

type Tab = "advantage" | "perplayer";

/**
 * Color palettes for per-player lines.
 * 5 green/teal shades for Radiant, 5 red/orange shades for Dire.
 */
const RADIANT_PALETTE = ["#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#34d399"];
const DIRE_PALETTE = ["#ef4444", "#f97316", "#f59e0b", "#fb7185", "#e11d48"];

/**
 * Filter and deduplicate objectives for graph markers.
 * Only show tower kills, Roshan kills, first blood, barracks.
 */
function getGraphObjectives(objectives: ObjectiveEvent[] | null): ObjectiveEvent[] {
  if (!objectives || objectives.length === 0) return [];
  const relevant = objectives.filter((o) =>
    ["CHAT_MESSAGE_TOWER_KILL", "CHAT_MESSAGE_ROSHAN_KILL", "CHAT_MESSAGE_FIRSTBLOOD", "CHAT_MESSAGE_BARRACKS_KILL", "CHAT_MESSAGE_COURIER_LOST"].includes(o.type)
  );
  return relevant;
}

function objectiveColor(type: string): string {
  if (type.includes("ROSHAN")) return "var(--warning)";
  if (type.includes("FIRSTBLOOD")) return "var(--error)";
  if (type.includes("TOWER")) return "var(--muted)";
  if (type.includes("BARRACKS")) return "#a855f7";
  if (type.includes("COURIER")) return "#f97316";
  return "var(--muted)";
}

function objectiveLabel(type: string): string {
  if (type.includes("ROSHAN")) return "Roshan";
  if (type.includes("FIRSTBLOOD")) return "First Blood";
  if (type.includes("TOWER")) return "Tower";
  if (type.includes("BARRACKS")) return "Barracks";
  if (type.includes("COURIER")) return "Courier";
  return type;
}

/** Custom tooltip for the Advantage tab */
function AdvantageTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: number }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg bg-[#1a1a2e] border border-[var(--card-border)] px-3 py-2 text-xs shadow-lg">
      <p className="text-[var(--muted)] mb-1">Minute {label}</p>
      {payload.map((entry) => {
        const prefix = (entry.value ?? 0) >= 0 ? "+" : "";
        return (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {prefix}{(entry.value ?? 0).toLocaleString()}
          </p>
        );
      })}
    </div>
  );
}

/** Custom tooltip for Per Player tab */
function PerPlayerTooltip({
  active,
  payload,
  label,
  playerMap,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: number;
  playerMap: Map<string, { name: string; color: string }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const sorted = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return (
    <div className="rounded-lg bg-[#1a1a2e] border border-[var(--card-border)] px-3 py-2 text-xs shadow-lg max-h-[260px] overflow-y-auto">
      <p className="text-[var(--muted)] mb-1">Minute {label}</p>
      {sorted.map((entry) => {
        const info = playerMap.get(entry.dataKey);
        return (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {info?.name ?? entry.dataKey}: {(entry.value ?? 0).toLocaleString()}g
          </p>
        );
      })}
    </div>
  );
}

function formatYAxis(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${value >= 0 ? "+" : ""}${(value / 1000).toFixed(0)}k`;
  }
  return `${value >= 0 ? "+" : ""}${value}`;
}

export default function GoldXpGraphs({ match }: GoldXpGraphsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("advantage");

  const advantageData = useMemo(
    () => buildAdvantageData(match.radiantGoldAdv, match.radiantXpAdv),
    [match.radiantGoldAdv, match.radiantXpAdv]
  );

  const perPlayerData = useMemo(
    () => buildPerPlayerData(match.players),
    [match.players]
  );

  const objectives = useMemo(
    () => getGraphObjectives(match.objectives),
    [match.objectives]
  );

  /**
   * Build player info map for per-player tab.
   * Maps "player_{slot}" -> { name, color, isRadiant }.
   */
  const playerMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string; isRadiant: boolean }>();
    let rIdx = 0;
    let dIdx = 0;
    for (const p of match.players) {
      if (p.goldT == null || p.goldT.length === 0) continue;
      const hero = getHero(p.heroId);
      const isRad = p.isRadiant === true;
      const color = isRad
        ? RADIANT_PALETTE[rIdx % RADIANT_PALETTE.length]
        : DIRE_PALETTE[dIdx % DIRE_PALETTE.length];
      if (isRad) rIdx++;
      else dIdx++;
      map.set(`player_${p.playerSlot}`, {
        name: hero?.name ?? `Hero ${p.heroId}`,
        color,
        isRadiant: isRad,
      });
    }
    return map;
  }, [match.players]);

  const hasAdvantageData = advantageData.length > 0;
  const hasPerPlayerData = perPlayerData.length > 0;

  return (
    <section>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-[var(--foreground)]">
          Gold & XP
        </h3>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-1 mb-4 rounded-lg bg-[var(--card-border)] p-1 w-fit">
        <button
          onClick={() => setActiveTab("advantage")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "advantage"
              ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Advantage
        </button>
        <button
          onClick={() => setActiveTab("perplayer")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "perplayer"
              ? "bg-[var(--card-bg)] text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Per Player
        </button>
      </div>

      <div className="rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] p-4">
        {/* Advantage tab */}
        {activeTab === "advantage" && (
          hasAdvantageData ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={advantageData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--card-border)"
                />
                <XAxis
                  dataKey="minute"
                  stroke="var(--muted)"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Minutes",
                    position: "insideBottomRight",
                    offset: -5,
                    style: { fill: "var(--muted)", fontSize: 11 },
                  }}
                />
                <YAxis
                  stroke="var(--muted)"
                  tick={{ fontSize: 11 }}
                  tickFormatter={formatYAxis}
                />
                <ReferenceLine
                  y={0}
                  stroke="var(--muted)"
                  strokeDasharray="3 3"
                />
                {/* Objective markers */}
                {objectives.map((obj, i) => {
                  const minute = Math.floor(obj.time / 60);
                  return (
                    <ReferenceLine
                      key={`obj-${i}`}
                      x={minute}
                      stroke={objectiveColor(obj.type)}
                      strokeDasharray="2 4"
                      strokeWidth={1}
                      label={{
                        value: objectiveLabel(obj.type),
                        position: "top",
                        style: {
                          fill: objectiveColor(obj.type),
                          fontSize: 9,
                        },
                      }}
                    />
                  );
                })}
                <Line
                  type="monotone"
                  dataKey="gold"
                  stroke="var(--warning)"
                  dot={false}
                  strokeWidth={2}
                  name="Gold Advantage"
                />
                <Line
                  type="monotone"
                  dataKey="xp"
                  stroke="var(--accent)"
                  dot={false}
                  strokeWidth={2}
                  name="XP Advantage"
                />
                <Tooltip
                  content={<AdvantageTooltip />}
                  cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-[var(--muted)]">
              No parsed data available for graphs
            </div>
          )
        )}

        {/* Per Player tab */}
        {activeTab === "perplayer" && (
          hasPerPlayerData ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={perPlayerData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--card-border)"
                  />
                  <XAxis
                    dataKey="minute"
                    stroke="var(--muted)"
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Minutes",
                      position: "insideBottomRight",
                      offset: -5,
                      style: { fill: "var(--muted)", fontSize: 11 },
                    }}
                  />
                  <YAxis
                    stroke="var(--muted)"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  {/* Objective markers */}
                  {objectives.map((obj, i) => {
                    const minute = Math.floor(obj.time / 60);
                    return (
                      <ReferenceLine
                        key={`obj-pp-${i}`}
                        x={minute}
                        stroke={objectiveColor(obj.type)}
                        strokeDasharray="2 4"
                        strokeWidth={1}
                      />
                    );
                  })}
                  {Array.from(playerMap.entries()).map(([dataKey, info]) => (
                    <Line
                      key={dataKey}
                      type="monotone"
                      dataKey={dataKey}
                      stroke={info.color}
                      dot={false}
                      strokeWidth={1.5}
                      name={info.name}
                    />
                  ))}
                  <Tooltip
                    content={
                      <PerPlayerTooltip
                        playerMap={playerMap}
                      />
                    }
                    cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
                {Array.from(playerMap.entries()).map(([dataKey, info]) => (
                  <div key={dataKey} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-1 rounded-full"
                      style={{ backgroundColor: info.color }}
                    />
                    <span className="text-[10px] text-[var(--muted)]">
                      {info.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-sm text-[var(--muted)]">
              No parsed data available for graphs
            </div>
          )
        )}
      </div>
    </section>
  );
}
