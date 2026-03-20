"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { validateMatchId } from "@/lib/validation";

export default function MatchIdInput() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setError(null);
      setWarning(null);

      const trimmed = value.trim();
      const validation = validateMatchId(trimmed);

      if (!validation.valid) {
        setError(validation.error ?? "Invalid Match ID");
        return;
      }

      setLoading(true);

      try {
        const res = await fetch(`/api/matches/${trimmed}`, {
          method: "POST",
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(
            body.error ?? `Failed to submit match (${res.status})`
          );
          setLoading(false);
          return;
        }

        const data = await res.json();

        // Show warning if match might be expired
        if (data.warning) {
          setWarning(data.warning);
        }

        if (data.status === "complete" && !data.jobId) {
          // Already analyzed, go to match page directly
          router.push(`/match/${trimmed}`);
        } else if (data.jobId) {
          // New job started, go to status page
          router.push(`/match/${trimmed}?jobId=${data.jobId}`);
        } else {
          router.push(`/match/${trimmed}`);
        }
      } catch {
        setError("Network error. Please try again.");
        setLoading(false);
      }
    },
    [value, router]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Enter Match ID (e.g., 8583844960)"
          className="w-full px-5 py-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)] text-lg text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-colors"
          disabled={loading}
          autoComplete="off"
          inputMode="numeric"
        />
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Analyzing...
            </span>
          ) : (
            "Analyze"
          )}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-[var(--error)] px-1">{error}</p>
      )}

      {warning && (
        <div className="mt-3 px-4 py-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 text-yellow-200 text-sm">
          {warning}
        </div>
      )}
    </form>
  );
}
