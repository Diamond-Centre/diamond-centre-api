import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { isProduction } from "../utils/security";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.error,
      message: err.message,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: "Internal Server Error",
    message: isProduction()
      ? "An unexpected error occurred"
      : err.message,
  });
}
