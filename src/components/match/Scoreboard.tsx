"use client";

import type { PlayerData } from "@/lib/match-types";
import { getTeamPlayers } from "@/lib/match-utils";
import PlayerRow from "./PlayerRow";

interface ScoreboardProps {
  players: PlayerData[];
  focusSlot: number | null;
  onFocusChange: (slot: number) => void;
  radiantWin: boolean;
}

const COLUMN_HEADERS = [
  { label: "Hero", className: "text-left" },
  { label: "Player", className: "text-left" },
  { label: "Lvl", className: "text-center" },
  { label: "K/D/A", className: "text-center" },
  { label: "LH/DN", className: "text-center" },
  { label: "GPM", className: "text-right" },
  { label: "XPM", className: "text-right" },
  { label: "NW", className: "text-right" },
  { label: "DMG", className: "text-right" },
  { label: "Tower", className: "text-right" },
  { label: "Heal", className: "text-right" },
  { label: "Items", className: "text-left" },
  { label: "", className: "text-center w-8" },
];

function TeamTable({
  team,
  teamName,
  teamColor,
  focusSlot,
  onFocusChange,
  radiantWin,
}: {
  team: PlayerData[];
  teamName: string;
  teamColor: string;
  focusSlot: number | null;
  onFocusChange: (slot: number) => void;
  radiantWin: boolean;
}) {
  return (
    <div className="rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] overflow-hidden">
      {/* Team header */}
      <div
        className="px-4 py-2 text-sm font-semibold border-b border-[var(--card-border)]"
        style={{ color: teamColor }}
      >
        {teamName}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-[var(--card-border)]">
              {COLUMN_HEADERS.map((col) => (
                <th
                  key={col.label || "expand"}
                  className={`px-2 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wider ${col.className}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {team.map((player) => (
              <PlayerRow
                key={player.playerSlot}
                player={player}
                isFocused={focusSlot === player.playerSlot}
                onFocus={() => onFocusChange(player.playerSlot)}
                radiantWin={radiantWin}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Scoreboard({
  players,
  focusSlot,
  onFocusChange,
  radiantWin,
}: ScoreboardProps) {
  const { radiant, dire } = getTeamPlayers(players);

  return (
    <div className="space-y-4">
      <TeamTable
        team={radiant}
        teamName="Radiant"
        teamColor="var(--success)"
        focusSlot={focusSlot}
        onFocusChange={onFocusChange}
        radiantWin={radiantWin}
      />
      <TeamTable
        team={dire}
        teamName="Dire"
        teamColor="var(--error)"
        focusSlot={focusSlot}
        onFocusChange={onFocusChange}
        radiantWin={radiantWin}
      />
    </div>
  );
}
