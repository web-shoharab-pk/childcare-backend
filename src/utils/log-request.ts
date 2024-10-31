import { NextFunction, Request, Response } from "express";
import logger from "./logger";

interface LogRequestOptions {
  fields?: string[];
}

// Middleware to log the request.
// Logic: by default it will log req.params and req.query if they exist.
// for the req.body, if no specific fields are provided in the fields, it will log the entire body.
export const logRequest = (options: LogRequestOptions = {}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const logData: Record<string, unknown> = {};

    if (Object.keys(req.params).length) {
      logData.params = req.params;
    }

    if (Object.keys(req.query).length) {
      logData.query = req.query;
    }

    if (req.body) {
      if (options.fields?.length) {
        options.fields.forEach((field) => {
          logData[field] = req.body[field];
        });
      } else {
        logData.body = req.body;
      }
    }

    logger.info(`${req.method} ${req.originalUrl}`, logData);

    // Store the original end method
    const oldEnd = res.end;
    // Override the end method
    res.end = function (this: Response, ...args: any[]): Response {
      // Log the status code after the original end method is called
      logger.info(`${req.method} ${req.originalUrl}`, {
        statusCode: res.statusCode,
      });
      return oldEnd.apply(this, args);
      oldEnd.apply(this, args);
    };

    next();
  };
};
