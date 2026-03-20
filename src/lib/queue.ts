import { Queue } from "bullmq";
import { redisConnectionOptions } from "./redis";

export interface ReplayJobData {
  matchId: string;
}

export const replayQueue = new Queue<ReplayJobData>("replay-pipeline", {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { age: 86400 }, // 24 hours
    removeOnFail: { age: 604800 }, // 7 days
  },
});
