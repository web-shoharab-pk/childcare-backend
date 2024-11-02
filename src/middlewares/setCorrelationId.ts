import { NextFunction, Request, Response } from "express";

export const setCorrelationId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const key = "x-trace-id";
  const correlationId = req.headers[key] ?? Date.now().toString();

  // Set correlation ID in request headers
  req.headers[key] = correlationId;

  next();
};
