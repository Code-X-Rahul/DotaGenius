import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

/**
 * Connection options for BullMQ Queue/Worker constructors.
 * Avoids ioredis version mismatch between bullmq's bundled ioredis and our installed one.
 */
export const redisConnectionOptions = {
  host: redisConnection.options.host ?? "localhost",
  port: redisConnection.options.port ?? 6379,
  password: redisConnection.options.password,
  db: redisConnection.options.db ?? 0,
  maxRetriesPerRequest: null as null,
};
