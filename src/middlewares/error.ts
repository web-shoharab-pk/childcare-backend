import { NextFunction, Request, Response } from "express";
import { MongoError } from "mongodb";
import { ZodError } from "zod";

interface CustomError extends Error {
  status?: number;
  code?: number;
  errors?: any;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle MongoDB specific errors
  if (err instanceof MongoError) {
    if (err.code === 11000) {
      // Duplicate key error
      res.status(409).json({
        trace_id: req.headers["x-trace-id"],
        message: "Duplicate Entry",
        error: "A record with this information already exists",
      });
      return;
    }
    res.status(400).json({
      trace_id: req.headers["x-trace-id"],
      message: "Database Error",
      error:
        process.env.NODE_ENV === "production"
          ? "Database operation failed"
          : err.message,
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      trace_id: req.headers["x-trace-id"],
      message: "Validation Error",
      errors: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // Handle known HTTP errors
  if (err.status) {
    res.status(err.status).json({
      trace_id: req.headers["x-trace-id"],
      message: err.message,
      error: err.name,
      errors: typeof err.errors === "string" ? [err.errors] : err.errors,
    });
    return;
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    res.status(401).json({
      trace_id: req.headers["x-trace-id"],
      message: "Authentication Error",
      error: err.message,
    });
    return;
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    res.status(400).json({
      trace_id: req.headers["x-trace-id"],
      message: "Validation Error",
      error: err.message,
    });
  }

  // Handle unauthorized errors
  if (err.name === "UnauthorizedError") {
    res.status(401).json({
      trace_id: req.headers["x-trace-id"],
      message: "Unauthorized",
      error: err.message,
    });
  }

  // Handle forbidden errors
  if (err.name === "ForbiddenError") {
    res.status(403).json({
      trace_id: req.headers["x-trace-id"],
      message: "Forbidden",
      error: err.message,
    });
  }

  // Default server error
  res.status(500).json({
    trace_id: req.headers["x-trace-id"],
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
  return;
};

// Error creator utility
export class AppError extends Error {
  constructor(message: string, public errors: any, public status: number) {
    super(message);
    this.name = "AppError";
  }
}
