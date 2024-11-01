import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { ZodError, ZodSchema } from "zod";
import logger from "../utils/logger";

export const validateRequest = (
  schema: ZodSchema,
  isParam: boolean = false
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (isParam) {
        // Check if params contains valid MongoDB ObjectId
        const params = req.params;
        for (const key in params) {
          if (!isValidObjectId(params[key])) {
            logger.warn("Invalid MongoDB ObjectId in params", {
              field: key,
              value: params[key],
            });
            res.status(400).json({
              success: false,
              traceId: req.headers["x-trace-id"],
              message: "Validation failed",
              errors: [
                {
                  field: key,
                  message: "Invalid MongoDB ObjectId",
                },
              ],
            });
            return;
          }
        }
        await schema.parseAsync(req.params);
      } else {
        await schema.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn("Validation failed", {
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        res.status(400).json({
          success: false,
          traceId: req.headers["x-trace-id"],
          message: "Validation failed",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
        return;
      }
      logger.error("Unexpected error during validation", { error });
      next(error);
    }
  };
};
