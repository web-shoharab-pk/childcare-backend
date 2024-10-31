import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import helmet from "helmet";
import { connectMongo } from "./config/mongo";
import { errorHandler } from "./middlewares/error";
import { setCorrelationId } from "./middlewares/setCorrelationId";
import activityRoutes from "./routes/activityRoutes";
import authRoutes from "./routes/authRoutes";
import logger from "./utils/logger"; // Import the logger

dotenv.config({ path: ".env" });

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(setCorrelationId);
// Use helmet for security
app.use(helmet());
// Enable CORS for all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-trace-id"],
    credentials: true,
  })
);

const baseUrl = "/api/v1";
// Routes
app.use(`${baseUrl}/activities`, activityRoutes);
app.use(`${baseUrl}/auth`, authRoutes);

// Health
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    platform: process.platform,
    nodeVersion: process.version,
  });
  return;
});

app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    correlationId: req.headers["x-trace-id"] || "not-set",
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Database connection and server start
connectMongo();
// Connect to PostgreSQL here with TypeORM setup

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`); // Use logger instead of console.log
});
