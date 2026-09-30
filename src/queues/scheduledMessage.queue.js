import { Queue } from "bullmq";
import { createRedisConnection } from "../config/redis.js";

export const SCHEDULED_MESSAGE_QUEUE = "scheduled-messages";

const queueConnection = createRedisConnection();

export const scheduledMessageQueue = new Queue(SCHEDULED_MESSAGE_QUEUE, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
    },
  },
});

export async function closeScheduledMessageQueue() {
  await scheduledMessageQueue.close();
  queueConnection.disconnect();
}
