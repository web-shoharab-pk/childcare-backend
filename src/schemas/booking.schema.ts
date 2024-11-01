import mongoose from "mongoose";
import { z } from "zod";

export const bookingZodSchema = z.object({
  activityId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid MongoDB ObjectId",
  }),
  userId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid MongoDB ObjectId",
  }),
});

// BOOKING ID VALIDATION
export const bookingIdZodSchema = z.object({
  bookingId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid MongoDB ObjectId for booking ID",
  }),
});

export const bookingConfirmationZodSchema = z.object({
  paymentStatus: z.enum(["pending", "completed", "failed"]),
});
