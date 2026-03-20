"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface JobStatus {
  stage: "idle" | "submitted" | "downloading" | "parsing" | "complete" | "failed";
  percent: number;
  error: string | null;
  isComplete: boolean;
}

const INITIAL_STATUS: JobStatus = {
  stage: "idle",
  percent: 0,
  error: null,
  isComplete: false,
};

export function useJobStatus(jobId: string | null): JobStatus {
  const [status, setStatus] = useState<JobStatus>(INITIAL_STATUS);
  const eventSourceRef = useRef<EventSource | null>(null);
  const failCountRef = useRef(0);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) {
      setStatus(INITIAL_STATUS);
      return;
    }

    // Reset state for new job
    setStatus({
      stage: "submitted",
      percent: 0,
      error: null,
      isComplete: false,
    });
    failCountRef.current = 0;

    const es = new EventSource(`/api/jobs/${jobId}/status`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          stage?: string;
          percent?: number;
          error?: string;
        };

        failCountRef.current = 0; // Reset on successful message

        if (data.stage === "complete") {
          setStatus({
            stage: "complete",
            percent: 100,
            error: null,
            isComplete: true,
          });
          es.close();
          return;
        }

        if (data.stage === "failed") {
          setStatus({
            stage: "failed",
            percent: 0,
            error: data.error ?? "Job failed",
            isComplete: false,
          });
          es.close();
          return;
        }

        setStatus({
          stage: (data.stage as JobStatus["stage"]) ?? "submitted",
          percent: data.percent ?? 0,
          error: null,
          isComplete: false,
        });
      } catch {
        // Malformed event, ignore
      }
    };

    es.onerror = () => {
      failCountRef.current++;
      if (failCountRef.current >= 3) {
        setStatus((prev) => ({
          ...prev,
          error: "Connection lost. Please refresh the page.",
        }));
        es.close();
      }
      // Otherwise, browser auto-reconnects EventSource
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [jobId, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return status;
}
