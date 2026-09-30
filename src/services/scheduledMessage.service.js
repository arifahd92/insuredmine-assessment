import { randomUUID } from "node:crypto";
import { AppError } from "../errors/AppError.js";
import { scheduledMessageQueue } from "../queues/scheduledMessage.queue.js";

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function scheduleMessage({ message, day, time }) {
  const text = message.trim();
  const dayText = day.trim();
  const timeText = time.trim();

  if (!text) {
    throw new AppError("Message is required", 400);
  }

  if (!dayPattern.test(dayText) || !timePattern.test(timeText)) {
    throw new AppError("Day must be YYYY-MM-DD and time must be HH:mm", 400);
  }

  const runAt = parseDayTime(dayText, timeText);

  if (runAt.getTime() <= Date.now()) {
    throw new AppError("Day and time must be in the future", 400);
  }

  const job = {
    scheduleId: randomUUID(),
    message: text,
    day: dayText,
    time: timeText,
  };

  await scheduledMessageQueue.add("save-message", job, {
    jobId: job.scheduleId,
    delay: runAt.getTime() - Date.now(),
  });

  return job;
}

function parseDayTime(day, time) {
  const [year, month, date] = day.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const runAt = new Date(year, month - 1, date, hours, minutes, 0, 0);

  if (
    runAt.getFullYear() !== year ||
    runAt.getMonth() !== month - 1 ||
    runAt.getDate() !== date
  ) {
    throw new AppError("Day must be YYYY-MM-DD and time must be HH:mm", 400);
  }

  return runAt;
}
