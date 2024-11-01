import { Types } from "mongoose";
import { z } from "zod";

// Custom validator for MongoDB ObjectId
const objectIdSchema = z.string().refine((val) => Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId format",
});

export const activityZodSchema = z.object({
  name: z
    .string({
      required_error: "Activity name is required",
      invalid_type_error: "Activity name must be a string",
    })
    .min(1, "Activity name cannot be empty"),

  description: z
    .string({
      required_error: "Description is required",
      invalid_type_error: "Description must be a string",
    })
    .min(1, "Description cannot be empty"),

  date: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), {
      message: "Invalid date format",
    }),
  maxAttendees: z.number({
    required_error: "Max attendees is required",
    invalid_type_error: "Max attendees must be a number",
  }),
  attendees: z.array(objectIdSchema).optional().default([]),
  price: z.number({
    required_error: "Price is required",
    invalid_type_error: "Price must be a number",
  }),
  location: z
    .string({
      required_error: "Location is required",
      invalid_type_error: "Location must be a string",
    })
    .min(1, "Location cannot be empty"),
});

export const activityUpdateZodSchema = z
  .object({
    name: z
      .string({
        invalid_type_error: "Activity name must be a string",
      })
      .min(1, "Activity name cannot be empty")
      .optional(),

    description: z
      .string({
        invalid_type_error: "Description must be a string",
      })
      .min(1, "Description cannot be empty")
      .optional(),

    date: z
      .string()
      .or(z.date())
      .transform((val) => new Date(val))
      .refine((date) => !isNaN(date.getTime()), {
        message: "Invalid date format",
      })
      .optional(),

    attendees: z.array(objectIdSchema).optional(),
    price: z
      .number({
        required_error: "Price is required",
        invalid_type_error: "Price must be a number",
      })
      .optional(),
    location: z
      .string({
        invalid_type_error: "Location must be a string",
      })
      .min(1, "Location cannot be empty")
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const activityAttendanceUpdateSchema = z.object({
  userId: objectIdSchema,
});

export const activityIdZodSchema = z.object({
  activityId: objectIdSchema,
});
