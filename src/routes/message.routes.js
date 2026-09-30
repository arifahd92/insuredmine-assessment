import { Router } from "express";
import { createScheduledMessage } from "../controllers/message.controller.js";

const router = Router();

router.post("/", createScheduledMessage);

export default router;
