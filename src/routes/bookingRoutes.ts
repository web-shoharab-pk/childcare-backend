import { Router } from "express";
import { BookingController } from "../controllers/bookingController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/request-validator";
import { activityIdZodSchema } from "../schemas/activitySchema";
import {
  bookingConfirmationZodSchema,
  bookingIdZodSchema,
  bookingZodSchema,
} from "../schemas/bookingSchema";
import { mongodbIdSchema } from "../schemas/mongodbIdSchema";
import { userIdZodSchema } from "../schemas/userSchema";
import { Role } from "../types/Role";
import { logRequest } from "../utils/log-request";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  "/",
  logRequest({}),
  validateRequest(bookingZodSchema),
  BookingController.createBooking
);

// Get user bookings by userId
router.get(
  "/user/:userId",
  authorize([Role.USER, Role.ADMIN]),
  validateRequest(userIdZodSchema, true),
  BookingController.getUserBookings
);

// get all bookings by activityId
router.get(
  "/activity/:activityId",
  authorize([Role.ADMIN]),
  validateRequest(activityIdZodSchema, true),
  BookingController.getActivityBookings
);

// Confirm booking by admin
router.post(
  "/:bookingId/confirm",
  authorize([Role.ADMIN]),
  validateRequest(bookingIdZodSchema, true), // Ensure BookingId is a valid MongoDB ObjectId
  validateRequest(bookingConfirmationZodSchema), // Ensure BookingId is a valid MongoDB ObjectId
  BookingController.confirmBooking
);

// Cancel booking by user
router.post(
  "/:id/cancel",
  validateRequest(mongodbIdSchema, true), // Ensure BookingId is a valid MongoDB ObjectId
  BookingController.cancelBooking
);

// Check availability of an activity
router.get(
  "/availability/:activityId", // activityId is a param
  logRequest({}),
  authorize([Role.USER, Role.ADMIN]),
  validateRequest(activityIdZodSchema, true), // Ensure activityId is a valid MongoDB ObjectId
  BookingController.checkAvailability
);

export default router;
