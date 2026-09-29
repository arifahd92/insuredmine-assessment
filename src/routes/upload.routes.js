import { Router } from "express";
import { uploadSheet } from "../controllers/upload.controller.js";
import { uploadSheetFile } from "../middleware/upload.js";

const router = Router();

router.post("/", uploadSheetFile, uploadSheet);

export default router;
