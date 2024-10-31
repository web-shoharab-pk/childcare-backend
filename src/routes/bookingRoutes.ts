import { Router } from "express";
import { BookingController } from "../controllers/bookingController";
import { authenticate, authorize } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/request-validator";
import { bookingZodSchema } from "../schemas/bookingSchema";
import { mongodbIdSchema } from "../schemas/mongodbIdSchema";
import { Role } from "../types/Role";
import { logRequest } from "../utils/log-request";

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  "/",
  logRequest({ fields: [""] }),
  validateRequest(bookingZodSchema),
  BookingController.createBooking
);
// router.get("/user", BookingController.getUserBookings);
// router.post("/:bookingId/confirm", BookingController.confirmBooking);

router.post(
  "/:id/cancel",
  validateRequest(mongodbIdSchema, true), // Ensure BookingId is a valid MongoDB ObjectId
  BookingController.cancelBooking
);

router.get(
  "/availability/:id", // activityId is a param
  logRequest({}),
  authorize([Role.ADMIN]),
  validateRequest(mongodbIdSchema, true), // Ensure activityId is a valid MongoDB ObjectId
  BookingController.checkAvailability
);

export default router;
