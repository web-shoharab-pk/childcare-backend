import { NextFunction, Request, Response } from "express";
import { LoadBalancer } from "../services/loadBalancer";
import logger from "../utils/logger";
import { AppError } from "./error";

const loadBalancer = new LoadBalancer();

export const proxyRequest = (serviceName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get next available service instance
      const serviceUrl = await loadBalancer.getNextHealthyService(serviceName);
      // Instead of proxying to different instances, just forward to the next middleware
      next();
    } catch (error) {
      logger.error(`Request failed for ${serviceName}:`, {
        error: error instanceof Error ? error.message : "Unknown error",
        traceId: req.headers["x-trace-id"],
        path: req.path,
        method: req.method,
      });
      next(new AppError("Internal Server Error", null, 500));
    }
  };
};
