import { NextFunction, Request, Response } from "express";
import { MongoError } from "mongodb";
import { ZodError } from "zod";
import { envConfig } from "../config/environment";

interface CustomError extends Error {
  status?: number;
  code?: number;
  errors?: any;
}

const handleMongoError = (err: MongoError, req: Request, res: Response) => {
  if (err.code === 11000) {
    res.status(409).json({
      success: false,
      trace_id: req.headers["x-trace-id"],
      message: "Duplicate Entry",
      error: "A record with this information already exists",
    });
  } else {
    res.status(400).json({
      success: false,
      trace_id: req.headers["x-trace-id"],
      message: "Database Error",
      error:
        envConfig.NODE_ENV === "production"
          ? "Database operation failed"
          : err.message,
    });
  }
};

const handleZodError = (err: ZodError, req: Request, res: Response) => {
  res.status(400).json({
    success: false,
    trace_id: req.headers["x-trace-id"],
    message: "Validation Error",
    errors: err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    })),
  });
};

const handleHttpError = (err: CustomError, req: Request, res: Response) => {
  const statusCode = err.status ?? 500; // Default to 500 if status is undefined
  res.status(statusCode).json({
    success: false,
    trace_id: req.headers["x-trace-id"],
    message: err.message,
    error: err.name,
    errors: typeof err.errors === "string" ? [err.errors] : err.errors,
  });
};

const handleJwtError = (err: CustomError, req: Request, res: Response) => {
  res.status(401).json({
    success: false,
    trace_id: req.headers["x-trace-id"],
    message: "Authentication Error",
    error: err.message,
  });
};

const handleDefaultError = (err: CustomError, req: Request, res: Response) => {
  res.status(500).json({
    success: false,
    trace_id: req.headers["x-trace-id"],
    message: "Internal Server Error",
    error:
      envConfig.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
    stack: envConfig.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (envConfig.NODE_ENV === "development") {
    console.error("Error:", {
      name: err.name,
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  if (err instanceof MongoError) {
    return handleMongoError(err, req, res);
  }

  if (err instanceof ZodError) {
    return handleZodError(err, req, res);
  }

  if (err.status) {
    return handleHttpError(err, req, res);
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return handleJwtError(err, req, res);
  }

  if (
    ["ValidationError", "UnauthorizedError", "ForbiddenError"].includes(
      err.name
    )
  ) {
    let statusCode;
    if (err.name === "ValidationError") {
      statusCode = 400;
    } else if (err.name === "UnauthorizedError") {
      statusCode = 401;
    } else {
      statusCode = 403;
    }
    res.status(statusCode).json({
      success: false,
      trace_id: req.headers["x-trace-id"],
      message: err.name === "ValidationError" ? "Validation Error" : err.name,
      error: err.message,
    });
    return;
  }

  return handleDefaultError(err, req, res);
};

// Error creator utility
export class AppError extends Error {
  constructor(message: string, public errors: any, public status: number) {
    super(message);
    this.name = "AppError";
  }
}
