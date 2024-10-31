import mongoose from "mongoose";
import { envConfig } from "./envConfig";

export const connectMongo = async () => {
  try {
    await mongoose.connect(envConfig.MONGO_URI as string);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};
