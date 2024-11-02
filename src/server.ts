import app from "./app";
import { connectMongo } from "./config/database";
import { envConfig } from "./config/environment";
import logger from "./utils/logger";

// Database connection and server start
const startServer = async () => {
  try {
    await connectMongo();
    const PORT = envConfig.PORT ?? 5000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdownServer = () => {
      logger.info("Shutting down the server due to an error...");
      server.close(() => {
        logger.info("Server closed successfully.");
        process.exit(1);
      });
    };

    process.on("unhandledRejection", (reason) => {
      const reasonString = typeof reason === 'object' && reason !== null ? '[object Object]' : reason;
      logger.error(`Unhandled Rejection reason: ${reasonString}`);
      shutdownServer();
    });

    process.on("uncaughtException", (error) => {
      logger.error(`Uncaught Exception: ${error}`);
      shutdownServer();
    });
  } catch (error) {
    logger.error("Failed to start the server:", error);
    process.exit(1);
  }
};

startServer();
