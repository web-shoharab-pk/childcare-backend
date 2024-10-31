import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
dotenv.config();

const activityService = createProxyMiddleware({
  target: process.env.SERVER_URL, // The address of your Activity Tracking Service
  changeOrigin: true,
});

export default activityService;
