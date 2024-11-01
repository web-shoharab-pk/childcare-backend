import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";
import { envConfig } from "./config/envConfig";
import { connectMongo } from "./config/mongo";
import { errorHandler } from "./middlewares/error";
import { proxyRequest } from "./middlewares/loadBalancerMiddleware";
import { setCorrelationId } from "./middlewares/setCorrelationId";
import activityRoutes from "./routes/activityRoutes";
import authRoutes from "./routes/authRoutes";
import bookingRoutes from "./routes/bookingRoutes";
import { LoadBalancer } from "./services/loadBalancer";
import logger from "./utils/logger"; // Import the logger
import { webhookHandler } from "./webhooks/webhook";

const app = express();
const loadBalancer = new LoadBalancer();

// Middlewares for what
// Parsing cookies from the request
app.use(cookieParser());
// Setting the correlation ID for each request
app.use(setCorrelationId);
// Using helmet to secure the Express app by setting various HTTP headers that help protect against well-known web vulnerabilities.
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
// Setting up express.json() middleware for all routes except the webhook
app.use((req, res, next) => {
  if (req.originalUrl === `${baseUrl}/webhook`) {
    next(); // Skip express.json() for the webhook
  } else {
    express.json()(req, res, next); // Parse JSON for other routes
  }
});

// Routes
app.use(`${baseUrl}/auth`, proxyRequest("auth"), authRoutes);
app.use(`${baseUrl}/activities`, proxyRequest("activity"), activityRoutes);
app.use(`${baseUrl}/bookings`, proxyRequest("booking"), bookingRoutes);
app.use(
  `${baseUrl}/webhook`,
  express.raw({ type: "application/json" }),
  webhookHandler
);

// Load balancer status endpoint
app.get("/loadbalancer/status", async (req: Request, res: Response) => {
  try {
    const serviceStatus = loadBalancer.getServiceStatus();
    const healthStatus: Record<string, Record<string, boolean>> = {};

    // Check health for all services
    for (const [service, instances] of Object.entries(serviceStatus)) {
      healthStatus[service] = {};
      for (const instance of instances.instances) {
        healthStatus[service][instance] = await loadBalancer.checkHealth(
          instance
        );
      }
    }

    res.json({
      status: "operational",
      timestamp: new Date().toISOString(),
      services: serviceStatus,
      health: healthStatus,
      environment: envConfig.NODE_ENV || "development",
    });
  } catch (error) {
    logger.error("Error getting load balancer status:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to get load balancer status",
      timestamp: new Date().toISOString(),
      correlationId: req.headers["x-trace-id"] || "not-set",
    });
  }
});

// Health
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: envConfig.NODE_ENV || "development",
    version: "1.0.0",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    pid: process.pid,
    platform: process.platform,
    nodeVersion: process.version,
  });
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

const PORT = envConfig.PORT || 5000;

// Database connection and server start
connectMongo();
// Connect to PostgreSQL here with TypeORM setup

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`); // Use logger instead of console.log
});
