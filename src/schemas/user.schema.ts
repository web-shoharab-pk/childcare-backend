import mongoose from "mongoose";
import { z } from "zod";
// Zod schema for validation
export const userZodSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["user", "admin"]).default("user"),
});

export const resetPasswordZodSchema = z.object({
  email: z.string().email(),
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const userIdZodSchema = z.object({
  userId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid MongoDB ObjectId for user ID",
  }),
});
