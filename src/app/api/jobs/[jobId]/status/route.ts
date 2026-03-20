import { NextRequest } from "next/server";
import { Queue } from "bullmq";
import { redisConnectionOptions } from "@/lib/redis";

export const dynamic = "force-dynamic";

const queue = new Queue("replay-pipeline", {
  connection: redisConnectionOptions,
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Controller already closed
        }
      }

      // Check initial job state before subscribing to events
      try {
        const job = await queue.getJob(jobId);
        if (job) {
          const state = await job.getState();
          if (state === "completed") {
            send({ stage: "complete", percent: 100 });
            controller.close();
            return;
          }
          if (state === "failed") {
            send({
              stage: "failed",
              error: job.failedReason ?? "Job failed",
            });
            controller.close();
            return;
          }
          // Send current progress if available
          const progress = job.progress as
            | { stage?: string; percent?: number }
            | undefined;
          if (progress && typeof progress === "object" && progress.stage) {
            send(progress);
          }
        }
      } catch {
        // Queue not available, continue to listen
      }

      // Use polling to check job status since QueueEvents requires
      // a separate Redis connection that may not be available.
      // Poll every 1 second for status updates.
      let lastProgressJson = "";
      const intervalId = setInterval(async () => {
        try {
          const job = await queue.getJob(jobId);
          if (!job) return;

          const state = await job.getState();

          if (state === "completed") {
            send({ stage: "complete", percent: 100 });
            clearInterval(intervalId);
            controller.close();
            return;
          }

          if (state === "failed") {
            send({
              stage: "failed",
              error: job.failedReason ?? "Job failed",
            });
            clearInterval(intervalId);
            controller.close();
            return;
          }

          // Send progress updates (only if changed)
          const progress = job.progress as
            | { stage?: string; percent?: number }
            | undefined;
          if (progress && typeof progress === "object") {
            const progressJson = JSON.stringify(progress);
            if (progressJson !== lastProgressJson) {
              lastProgressJson = progressJson;
              send(progress);
            }
          }
        } catch {
          // Redis unavailable, skip this tick
        }
      }, 1000);

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
