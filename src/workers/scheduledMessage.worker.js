import { Worker } from "bullmq";
import { createRedisConnection } from "../config/redis.js";
import { SCHEDULED_MESSAGE_QUEUE } from "../queues/scheduledMessage.queue.js";
import Message from "../models/Message.js";

const workerConnection = createRedisConnection();

export const scheduledMessageWorker = new Worker(
  SCHEDULED_MESSAGE_QUEUE,
  async (job) => {
    try {
      await Message.create(job.data);
      console.log(`Saved scheduled message ${job.data.scheduleId}`);
    } catch (error) {
      if (error.code === 11000) {
        return;
      }

      throw error;
    }
  },
  {
    connection: workerConnection,
    concurrency: 5,
  }
);

scheduledMessageWorker.on("failed", (job, error) => {
  console.error(`Scheduled message ${job?.id} failed:`, error.message);
});

scheduledMessageWorker.on("error", (error) => {
  console.error("Message worker error:", error.message);
});

export async function closeScheduledMessageWorker() {
  await scheduledMessageWorker.close();
  workerConnection.disconnect();
}
