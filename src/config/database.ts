import mongoose from "mongoose";
import { envConfig } from "./environment";

export const connectMongo = async () => {
  try {
    await mongoose.connect(envConfig.MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};
