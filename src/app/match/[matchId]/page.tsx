"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import StatusTimeline from "@/components/StatusTimeline";
import { useJobStatus } from "@/hooks/useJobStatus";
import { addRecent } from "@/hooks/useRecentMatches";

interface MatchData {
  matchId: string;
  duration?: number;
  gameMode?: number;
  status: string;
  parsedAt?: string;
  errorMsg?: string;
  warning?: string;
}

type ErrorType =
  | "replay_expired"
  | "replay_unavailable"
  | "parse_failed"
  | "download_failed"
  | "unknown";

function getErrorInfo(errorMsg: string): {
  type: ErrorType;
  title: string;
  description: string;
} {
  const lower = errorMsg.toLowerCase();
  if (lower.includes("expired") || lower.includes("older than")) {
    return {
      type: "replay_expired",
      title: "Replay Expired",
      description:
        "This match is older than 14 days. Valve deletes replays after approximately two weeks.",
    };
  }
  if (lower.includes("not available") || lower.includes("no replay url")) {
    return {
      type: "replay_unavailable",
      title: "Replay Not Available",
      description:
        "The replay URL could not be found. This match may not have been recorded by OpenDota.",
    };
  }
  if (lower.includes("parse") || lower.includes("corrupted")) {
    return {
      type: "parse_failed",
      title: "Parse Failed",
      description:
        "The replay file was downloaded but could not be parsed. The file may be corrupted or in an unsupported format.",
    };
  }
  if (lower.includes("download")) {
    return {
      type: "download_failed",
      title: "Download Failed",
      description:
        "The replay could not be downloaded from Valve's servers. This might be a temporary issue.",
    };
  }
  return {
    type: "unknown",
    title: "Analysis Failed",
    description: errorMsg,
  };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function gameModeLabel(mode: number): string {
  const modes: Record<number, string> = {
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
  return modes[mode] ?? `Mode ${mode}`;
}

export default function MatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = use(params);
  const searchParams = useSearchParams();
  const jobIdParam = searchParams.get("jobId");

  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(jobIdParam);

  const jobStatus = useJobStatus(activeJobId);

  // Fetch match data
  const fetchMatch = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (res.status === 404) {
        // Match not found, no existing data
        setMatchData(null);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setFetchError(`Failed to load match data (${res.status})`);
        setLoading(false);
        return;
      }
      const data = (await res.json()) as MatchData;
      setMatchData(data);
      setLoading(false);
    } catch {
      setFetchError("Network error loading match data");
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchMatch();
  }, [fetchMatch]);

  // When job completes, refetch match data and save to recent
  useEffect(() => {
    if (jobStatus.isComplete) {
      addRecent(matchId);
      setActiveJobId(null);
      setLoading(true);
      fetchMatch();
    }
  }, [jobStatus.isComplete, matchId, fetchMatch]);

  // Handle re-analyze
  const handleReanalyze = async () => {
    setFetchError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "POST",
      });
      if (!res.ok) {
        setFetchError("Failed to start re-analysis");
        return;
      }
      const data = await res.json();
      if (data.jobId) {
        setActiveJobId(data.jobId);
        setMatchData(null);
      }
    } catch {
      setFetchError("Network error starting re-analysis");
    }
  };

  // Show failed job error
  if (jobStatus.stage === "failed" && jobStatus.error) {
    const errorInfo = getErrorInfo(jobStatus.error);
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/30 border border-red-700/50 flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">{errorInfo.title}</h1>
            <p className="text-[var(--muted)] text-sm mb-1">
              Match #{matchId}
            </p>
            <p className="text-[var(--muted)] text-sm mt-4">
              {errorInfo.description}
            </p>
          </div>
          <div className="flex flex-col gap-3 items-center">
            <Link
              href="/"
              className="px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition-colors"
            >
              Try a different match
            </Link>
            <button
              onClick={handleReanalyze}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Retry this match
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show pipeline progress when there's an active job
  if (activeJobId && !jobStatus.isComplete) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-20">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-2">Analyzing Match</h1>
          <p className="text-[var(--muted)] text-sm font-mono">#{matchId}</p>
        </div>
        <StatusTimeline
          stage={jobStatus.stage}
          percent={jobStatus.percent}
          error={jobStatus.error}
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-20">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-[var(--muted)] text-sm">Loading match data...</p>
      </div>
    );
  }

  // Fetch error
  if (fetchError) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-20">
        <p className="text-[var(--error)] mb-4">{fetchError}</p>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition-colors"
        >
          Back to home
        </Link>
      </div>
    );
  }

  // Completed match summary
  if (matchData && matchData.status === "complete") {
    return (
      <div className="flex flex-col flex-1 items-center px-6 py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Match Analysis</h1>
            <p className="text-[var(--muted)] text-sm font-mono">
              #{matchData.matchId}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">Status</span>
              <span className="text-[var(--success)] font-medium">
                Complete
              </span>
            </div>
            {matchData.duration !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Duration</span>
                <span>{formatDuration(matchData.duration)}</span>
              </div>
            )}
            {matchData.gameMode !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Game Mode</span>
                <span>{gameModeLabel(matchData.gameMode)}</span>
              </div>
            )}
            {matchData.parsedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Analyzed</span>
                <span>
                  {new Date(matchData.parsedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 items-center">
            <button
              onClick={handleReanalyze}
              className="px-6 py-2.5 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent)] text-[var(--foreground)] font-medium text-sm transition-colors"
            >
              Re-analyze
            </button>
            <Link
              href="/"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Analyze another match
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Match exists but failed
  if (matchData && matchData.status === "failed" && matchData.errorMsg) {
    const errorInfo = getErrorInfo(matchData.errorMsg);
    return (
      <div className="flex flex-col flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">{errorInfo.title}</h1>
          <p className="text-[var(--muted)] text-sm mb-1">Match #{matchId}</p>
          <p className="text-[var(--muted)] text-sm mt-4 mb-8">
            {errorInfo.description}
          </p>
          <div className="flex flex-col gap-3 items-center">
            <button
              onClick={handleReanalyze}
              className="px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition-colors"
            >
              Try again
            </button>
            <Link
              href="/"
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Try a different match
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No match data and no active job -- prompt to analyze
  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 py-20">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Match #{matchId}</h1>
        <p className="text-[var(--muted)] text-sm mb-8">
          This match has not been analyzed yet.
        </p>
        <button
          onClick={handleReanalyze}
          className="px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition-colors"
        >
          Start Analysis
        </button>
      </div>
    </div>
  );
}
