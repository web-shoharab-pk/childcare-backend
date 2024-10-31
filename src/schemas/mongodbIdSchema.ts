import { z } from "zod";
import { Types } from "mongoose";

// MongoDB ObjectId validation schema
export const mongodbIdSchema = z.custom<Types.ObjectId>((val) => {
  try {
    // Check if it's already an ObjectId
    if (val instanceof Types.ObjectId) return true;
    
    // Check if it can be converted to a valid ObjectId
    return Types.ObjectId.isValid(val);
  } catch {
    return false;
  }
}, {
  message: "Invalid MongoDB ObjectId"
});

