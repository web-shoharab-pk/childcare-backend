import { Types } from "mongoose";
import { z } from "zod";

// MongoDB ObjectId validation schema
export const mongodbIdSchema = z.custom<Types.ObjectId>(
  (val) => {
    try {
      // Check if it's already an ObjectId
      if (val instanceof Types.ObjectId) return true;

      // Check if it can be converted to a valid ObjectId
      return Types.ObjectId.isValid(val);
    } catch {
      return false;
    }
  },
  {
    message: "Invalid MongoDB ObjectId",
  }
);

export const activityIdSchema = z.custom<Types.ObjectId>(
  (val) => {
    try {
      // Check if it's already an ObjectId
      if (val instanceof Types.ObjectId) return true;

      // Check if it can be converted to a valid MongoDB ObjectId
      return Types.ObjectId.isValid(val);
    } catch {
      return false;
    }
  },
  {
    message: "Invalid Activity MongoDB ObjectId",
  }
);
