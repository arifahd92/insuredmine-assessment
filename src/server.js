import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import {
  closeScheduledMessageQueue,
  scheduledMessageQueue,
} from "./queues/scheduledMessage.queue.js";
import { watchCpu } from "./services/cpuMonitor.js";
import {
  closeScheduledMessageWorker,
  scheduledMessageWorker,
} from "./workers/scheduledMessage.worker.js";

const port = Number(process.env.PORT) || 3000;
let httpServer;
let closing = false;

async function start() {
  try {
    await connectDB();
    await scheduledMessageQueue.waitUntilReady();
    await scheduledMessageWorker.waitUntilReady();
    console.log("Message queue ready");
    httpServer = app.listen(port, () => {
      console.log(`Server listening on http://127.0.0.1:${port}`);
      watchCpu();
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  if (closing) {
    return;
  }

  closing = true;
  console.log(`${signal} received. Closing the server.`);

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  await closeScheduledMessageWorker();
  await closeScheduledMessageQueue();
  await mongoose.disconnect();
  process.exit(0);
}

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    console.error(error);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    console.error(error);
    process.exit(1);
  });
});

start();
