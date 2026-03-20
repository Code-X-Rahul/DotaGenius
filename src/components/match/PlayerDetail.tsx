"use client";

import Image from "next/image";
import type { PlayerData } from "@/lib/match-types";
import { getItemImage, getItemName } from "@/lib/dota-constants";

function formatTime(seconds: number): string {
  const neg = seconds < 0;
  const abs = Math.abs(seconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${neg ? "-" : ""}${m}:${s.toString().padStart(2, "0")}`;
}

const RUNE_NAMES: Record<number, string> = {
  0: "Double Damage",
  1: "Haste",
  2: "Illusion",
  3: "Invisibility",
  4: "Regeneration",
  5: "Bounty",
  6: "Arcane",
  7: "Water",
  8: "Wisdom",
  9: "Shield",
};

interface PlayerDetailProps {
  player: PlayerData;
}

export default function PlayerDetail({ player }: PlayerDetailProps) {
  const hasPurchaseLog =
    player.purchaseLog && player.purchaseLog.length > 0;
  const hasAbilities =
    player.abilityUpgrades && player.abilityUpgrades.length > 0;
  const hasDamage = player.damage && Object.keys(player.damage).length > 0;
  const hasDamageTaken =
    player.damageTaken && Object.keys(player.damageTaken).length > 0;
  const hasWards =
    (player.obsPlaced != null && player.obsPlaced > 0) ||
    (player.senPlaced != null && player.senPlaced > 0);
  const hasRunes = player.runesLog && player.runesLog.length > 0;

  const noData =
    !hasPurchaseLog &&
    !hasAbilities &&
    !hasDamage &&
    !hasDamageTaken &&
    !hasWards &&
    !hasRunes;

  if (noData) {
    return (
      <div className="px-4 py-3 text-sm text-[var(--muted)]">
        No detailed data available for this player.
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-5 border-t border-[var(--card-border)] bg-[var(--background)]/50">
      {/* Purchase Timeline */}
      {hasPurchaseLog && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
            Purchase Timeline
          </h4>
          <div className="flex flex-wrap gap-2">
            {player.purchaseLog!.map((purchase, i) => {
              const imgUrl = getItemImage(
                // purchaseLog stores item key strings, not IDs -- show name + time
                0
              );
              const itemName = purchase.key.replace("recipe_", "Recipe: ").replace(/_/g, " ");
              return (
                <div
                  key={`${purchase.key}-${purchase.time}-${i}`}
                  className="flex items-center gap-1 rounded bg-[var(--card-bg)] border border-[var(--card-border)] px-2 py-1"
                  title={itemName}
                >
                  <span className="text-xs font-mono text-[var(--muted)]">
                    {formatTime(purchase.time)}
                  </span>
                  <span className="text-xs truncate max-w-[100px]">
                    {itemName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ability Build */}
      {hasAbilities && (
        <div>
          <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
            Ability Build
          </h4>
          <div className="flex flex-wrap gap-1">
            {player.abilityUpgrades!.map((upgrade, i) => (
              <div
                key={`ability-${i}`}
                className="w-7 h-7 rounded bg-[var(--card-bg)] border border-[var(--card-border)] flex items-center justify-center text-xs font-mono"
                title={`Level ${upgrade.level} - Ability ${upgrade.ability} at ${formatTime(upgrade.time)}`}
              >
                {upgrade.level}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Damage Dealt */}
        {hasDamage && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
              Damage Dealt (Top 8)
            </h4>
            <div className="space-y-1">
              {Object.entries(player.damage!)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([target, dmg]) => (
                  <div
                    key={target}
                    className="flex justify-between text-xs"
                  >
                    <span className="truncate max-w-[150px]">
                      {target.replace("npc_dota_hero_", "").replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-[var(--foreground)]">
                      {dmg.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Damage Taken */}
        {hasDamageTaken && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
              Damage Taken (Top 8)
            </h4>
            <div className="space-y-1">
              {Object.entries(player.damageTaken!)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([source, dmg]) => (
                  <div
                    key={source}
                    className="flex justify-between text-xs"
                  >
                    <span className="truncate max-w-[150px]">
                      {source.replace("npc_dota_hero_", "").replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-[var(--foreground)]">
                      {dmg.toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Wards and Runes row */}
      <div className="flex flex-wrap gap-6">
        {hasWards && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Wards Placed
            </h4>
            <div className="flex gap-3 text-sm">
              <span>
                <span className="text-[var(--warning)]">{player.obsPlaced ?? 0}</span>{" "}
                <span className="text-[var(--muted)]">obs</span>
              </span>
              <span>
                <span className="text-[var(--accent)]">{player.senPlaced ?? 0}</span>{" "}
                <span className="text-[var(--muted)]">sen</span>
              </span>
            </div>
          </div>
        )}

        {hasRunes && (
          <div>
            <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
              Runes Picked Up
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {(() => {
                const runeCounts: Record<number, number> = {};
                for (const rune of player.runesLog!) {
                  runeCounts[rune.key] = (runeCounts[rune.key] ?? 0) + 1;
                }
                return Object.entries(runeCounts).map(([key, count]) => (
                  <span
                    key={key}
                    className="rounded bg-[var(--card-bg)] border border-[var(--card-border)] px-2 py-0.5"
                  >
                    {RUNE_NAMES[Number(key)] ?? `Rune ${key}`} x{count}
                  </span>
                ));
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
