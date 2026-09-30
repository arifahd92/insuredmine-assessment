import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("REDIS_URL is missing. Add it to your .env file.");
}

export function createRedisConnection() {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
  });
}
