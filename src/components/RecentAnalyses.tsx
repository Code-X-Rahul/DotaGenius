"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecent, type RecentMatchEntry } from "@/hooks/useRecentMatches";

const POPULAR_PLACEHOLDER: RecentMatchEntry[] = [
  { matchId: "8583844960", heroName: "Anti-Mage", timestamp: Date.now() - 3600000 },
  { matchId: "8583712345", heroName: "Invoker", timestamp: Date.now() - 7200000 },
  { matchId: "8582999001", heroName: "Pudge", timestamp: Date.now() - 10800000 },
];

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function MatchCard({ entry }: { entry: RecentMatchEntry }) {
  return (
    <Link
      href={`/match/${entry.matchId}`}
      className="flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--accent)]/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-mono text-[var(--accent)] group-hover:text-white transition-colors">
          #{entry.matchId}
        </span>
        {entry.heroName && (
          <span className="text-sm text-[var(--muted)]">{entry.heroName}</span>
        )}
      </div>
      <span className="text-xs text-[var(--muted)]">
        {formatTimeAgo(entry.timestamp)}
      </span>
    </Link>
  );
}

export default function RecentAnalyses() {
  const [recentMatches, setRecentMatches] = useState<RecentMatchEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRecentMatches(getRecent());
  }, []);

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <div className="w-full max-w-lg space-y-8">
      {/* Your Recent Analyses */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-[var(--foreground)]">
          Your Recent Analyses
        </h2>
        {recentMatches.length === 0 ? (
          <div className="px-4 py-6 rounded-lg bg-[var(--card-bg)] border border-[var(--card-border)] text-center">
            <p className="text-[var(--muted)] text-sm">
              No analyses yet. Enter a Match ID above to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentMatches.map((entry) => (
              <MatchCard key={entry.matchId} entry={entry} />
            ))}
          </div>
        )}
      </section>

      {/* Popular Analyses */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-[var(--foreground)]">
          Popular Analyses
        </h2>
        <div className="space-y-2">
          {POPULAR_PLACEHOLDER.map((entry) => (
            <MatchCard key={entry.matchId} entry={entry} />
          ))}
        </div>
      </section>
    </div>
  );
}
