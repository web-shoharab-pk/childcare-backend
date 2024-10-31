import { createClerkClient } from "@clerk/clerk-sdk-node";
import dotenv from "dotenv";

dotenv.config();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

export default clerkClient;
