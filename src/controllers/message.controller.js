import { AppError } from "../errors/AppError.js";
import { scheduleMessage } from "../services/scheduledMessage.service.js";

export async function createScheduledMessage(req, res) {
  const { message, day, time } = req.body ?? {};

  if (typeof message !== "string" || typeof day !== "string" || typeof time !== "string") {
    throw new AppError("message, day, and time are required", 400);
  }

  await scheduleMessage({ message, day, time });

  res.status(202).json({
    success: true,
    message: "Message accepted. It will be saved at the given day and time.",
  });
}
