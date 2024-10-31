import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import { envConfig } from "../config/envConfig";
dotenv.config();

const activityService = createProxyMiddleware({
  target: envConfig.SERVER_URL, // The address of your Activity Tracking Service
  changeOrigin: true,
});

export default activityService;
