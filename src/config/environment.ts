import dotenv from "dotenv";
import path from "path";
// Load environment variables only once
// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({
  path: path.resolve(__dirname, `../../${envFile}`),
});

export const envConfig = {
  PORT: process.env.PORT ?? 5000,
  MONGO_URI: process.env.MONGO_URI as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY as string,
  NODE_ENV: process.env.NODE_ENV as string,
  // Cookie settings
  COOKIE_MAX_AGE: parseInt(process.env.COOKIE_MAX_AGE ?? "604800000"),
  COOKIE_HTTP_ONLY: process.env.COOKIE_HTTP_ONLY === "true",
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
  COOKIE_NAME: process.env.COOKIE_NAME as string,

  SERVER_URL: process.env.SERVER_URL as string,
  FRONTEND_URL: process.env.FRONTEND_URL as string,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY as string,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET as string,
  EMAIL_FROM: process.env.EMAIL_FROM as string,
  EMAIL_SERVICE: process.env.EMAIL_SERVICE as string,
  SMPT_MAIL: process.env.SMPT_MAIL as string,
  SMPT_PASSWORD: process.env.SMPT_PASSWORD as string,
  SMPT_SERVICE: process.env.SMPT_SERVICE as string,

  // Test environment
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD as string,
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL as string,
  TEST_USER_WEAK_PASSWORD: process.env.TEST_USER_WEAK_PASSWORD as string,
  TEST_USER_WRONG_PASSWORD: process.env.TEST_USER_WRONG_PASSWORD as string,
  TEST_USER_NEW_PASSWORD: process.env.TEST_USER_NEW_PASSWORD as string,
};
