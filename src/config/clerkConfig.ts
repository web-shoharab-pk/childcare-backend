import { createClerkClient } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";
import { envConfig } from "./envConfig";

dotenv.config();

const clerkClient = createClerkClient({
  secretKey: envConfig.CLERK_SECRET_KEY,
});

export default clerkClient;
