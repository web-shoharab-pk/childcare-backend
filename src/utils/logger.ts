import path from "path";
import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";
import { envConfig } from "../config/environment";

// Use relative path for logs directory
const LOG_DIR = "logs";

class LogManager {
  private static instance: LogManager;
  private logger: any;
  nodeEnv: string;

  constructor() {
    this.nodeEnv = envConfig.NODE_ENV || "development";
    this.logger = createLogger({
      level: "info",
      format: format.combine(
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
        format((info) => {
          const correlationId = this.getCorrelationId();
          if (correlationId) {
            info.correlationId = correlationId;
          }
          return info;
        })()
      ),
      transports: [
        new transports.File({
          filename: path.join(LOG_DIR, "error.log"),
          level: "error",
        }),
        new transports.File({
          filename: path.join(LOG_DIR, "combined.log"),
        }),
        new transports.DailyRotateFile({
          level: "info",
          filename: "logs/application-%DATE%.log", // Use relative path
          datePattern: "YYYY-MM-DD-HH",
          zippedArchive: true,
          maxSize: "20m",
          maxFiles: "14d",
        }),
      ],
    });

    if (this.nodeEnv !== "production") {
      this.logger.add(
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        })
      );
    }
  }
  private getCorrelationId(): string | undefined {
    const requestContext = (global as any).requestContext;
    if (requestContext?.headers) {
      return requestContext.headers["x-trace-id"];
    }
    return undefined;
  }

  public getLogger() {
    return this.logger;
  }

  public static getInstance(): LogManager {
    if (!LogManager.instance) {
      LogManager.instance = new LogManager();
    }
    return LogManager.instance;
  }
}

export default LogManager.getInstance().getLogger();
