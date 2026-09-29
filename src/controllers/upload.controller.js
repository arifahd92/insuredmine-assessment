import fs from "node:fs/promises";
import { Worker } from "node:worker_threads";
import { AppError } from "../errors/AppError.js";
import { importRows } from "../services/importSheet.js";

export async function uploadSheet(req, res) {
  if (!req.file) {
    throw new AppError("Upload a CSV or XLSX file in the file field", 400);
  }

  try {
    const result = await runParser(req.file.path);
    const summary = await importRows(result.rows);

    res.json({
      success: true,
      message: "File saved to the database.",
      fileName: req.file.originalname,
      rowCount: result.rows.length,
      new: summary.new,
      duplicates: summary.duplicates,
      failed: summary.failed,
    });
  } finally {
    await fs.unlink(req.file.path).catch(() => {});
  }
}

function runParser(filePath) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/parseSheet.worker.js", import.meta.url), {
      workerData: { filePath },
    });

    let settled = false;

    function finish(onDone, value) {
      if (settled) {
        return;
      }

      settled = true;
      onDone(value);
    }

    worker.on("message", (result) => {
      if (!result || !Array.isArray(result.rows)) {
        return;
      }

      finish(resolve, result);
    });
    worker.once("error", (error) => finish(reject, error));
    worker.once("exit", (code) => {
      if (code !== 0) {
        finish(reject, new AppError("The file could not be read", 400));
      }
    });
  });
}
