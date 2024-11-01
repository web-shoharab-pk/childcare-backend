import dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({
  path: path.resolve(__dirname, "../../.env.test"),
});

// Set test environment
process.env.NODE_ENV = "test";

// Default test environment variables
const defaultTestConfig = {
  PORT: "6000",
  MONGO_URI: "mongodb://localhost:27017/childcare-test",
  JWT_SECRET: "test-secret",
  CLERK_SECRET_KEY: "test-clerk-key",
  COOKIE_MAX_AGE: "604800000",
  COOKIE_HTTP_ONLY: "true",
  COOKIE_SECURE: "false",
  COOKIE_NAME: "auth_token",
  SERVER_URL: "http://localhost:5000",
  FRONTEND_URL: "http://localhost:3000",
  STRIPE_SECRET_KEY: "test-stripe-key",
  STRIPE_WEBHOOK_SECRET: "test-webhook-secret",
  SMPT_MAIL: "test@example.com",
  SMPT_SERVICE: "gmail",
  SMPT_PASSWORD: "test-password",
};

// Set default values if not provided in .env.test
Object.entries(defaultTestConfig).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});
