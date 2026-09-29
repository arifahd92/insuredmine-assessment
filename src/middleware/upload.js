import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { AppError } from "../errors/AppError.js";

const uploadDir = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === ".csv" || ext === ".xlsx") {
    cb(null, true);
    return;
  }

  cb(new AppError("Only CSV and XLSX files are allowed", 400));
}

export const uploadSheetFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("file");
