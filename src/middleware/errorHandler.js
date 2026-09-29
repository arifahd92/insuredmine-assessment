import { AppError } from "../errors/AppError.js";

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  const statusCode = getStatusCode(err);
  const message = getMessage(err, statusCode);

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

function getStatusCode(err) {
  if (err.name === "ValidationError") {
    return 400;
  }

  if (err.code === 11000) {
    return 409;
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return 400;
  }

  if (typeof err.statusCode === "number") {
    return err.statusCode;
  }

  if (typeof err.status === "number") {
    return err.status;
  }

  if (err instanceof SyntaxError && err.type === "entity.parse.failed") {
    return 400;
  }

  return 500;
}

function getMessage(err, statusCode) {
  if (err.name === "ValidationError") {
    const firstError = Object.values(err.errors)[0];
    return firstError?.message || "Validation failed";
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "value";
    return `This ${field} is already saved`;
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return "File is too large. The limit is 10 MB.";
  }

  if (statusCode >= 500 && process.env.NODE_ENV === "production") {
    return "Internal server error";
  }

  if (err instanceof AppError || statusCode < 500) {
    return err.message || "Request failed";
  }

  return err.message || "Internal server error";
}
