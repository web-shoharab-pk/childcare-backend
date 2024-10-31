import { NextFunction, Request, Response } from "express";
import { stripe } from "../config/stripe";
import { AppError } from "../middlewares/error";
import { Activity } from "../models/Activity";
import { Booking, BookingStatus } from "../models/Booking";
import logger from "../utils/logger"; // Import the logger

export class BookingController {
  // Create a new booking
  static async createBooking(req: Request, res: Response, next: NextFunction) {
    const { activityId, userId } = req.body;

    try {
      // Check availability
      const activity = await Activity.findById(activityId);
      if (!activity) {
        logger.error("Activity not found: " + activityId);
        res.status(404).json({
          success: false,
          status: "error",
          message:
            "The requested activity could not be found. Please verify the activity ID and try again.",
          errors: ["ACTIVITY_NOT_FOUND"],
        });
        return;
      }

      // Verify booking eligibility
      const existingBooking = await Booking.findOne({ activityId, userId });
      if (existingBooking) {
        logger.warn("Duplicate booking attempt by user: " + userId);
        res.status(400).json({
          success: false,
          status: "error",
          message:
            "You have already booked this activity. Please check your bookings for more details.",
          errors: ["DUPLICATE_BOOKING"],
        });
        return;
      }

      // Create a new booking with payment status pending
      const booking = new Booking({
        activityId,
        userId,
        date: activity.date,
        isConfirmed: false,
        totalAmount: activity.price,
        paymentStatus: "pending",
      });

      // Proceed to payment (Stripe payment)
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: activity.name,
              },
              unit_amount: activity.price * 100,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.FRONTEND_URL}/booking-confirmation?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/booking-cancelled`,
        metadata: {
          bookingId: booking.id,
          userId: userId,
        },
      });
      booking.paymentId = session.id;
      await booking.save();

      logger.info("Booking created successfully: " + booking.id);
      res.json({
        success: true,
        message: "Booking created successfully, redirecting to payment...",
        url: session.url,
        bookingId: booking.id,
      });
    } catch (error) {
      logger.error("Failed to create booking: " + error);
      next(new AppError("Failed to create booking", error, 500));
      return;
    }
  }

  // Confirm booking
  static async confirmBooking(req: Request, res: Response) {
    const { bookingId, paymentStatus } = req.body;

    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        logger.warn("Booking not found: " + bookingId);
        return res.status(404).json({ message: "Booking not found" });
      }

      // Update booking confirmation based on payment status
      if (paymentStatus === "completed") {
        booking.isConfirmed = true;
        booking.paymentStatus = "completed";
        await booking.save();

        logger.info("Booking confirmed successfully: " + bookingId);
        res.json({ message: "Booking confirmed successfully", booking });
      } else {
        logger.warn("Payment not completed for booking: " + bookingId);
        res.status(400).json({ message: "Payment not completed" });
      }
    } catch (error) {
      logger.error("Failed to confirm booking: " + error);
      res
        .status(500)
        .json({ error: "Failed to confirm booking", details: error });
    }
  }

  // Check booking availability
  static async checkAvailability(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    const { id } = req.params;
    try {
      const activity = await Activity.findById(id);
      console.log("activity", activity);
      if (!activity) {
        logger.warn("Activity not found: ", { id });
        next(new AppError("Activity not found", null, 404));
        return;
      }

      // Count bookings for this activity
      const bookingCount = await Booking.countDocuments({ activityId: id });
      const maxAttendees = activity.maxAttendees; //  maximum capacity for an activity

      const available = bookingCount < maxAttendees;
      res.json({
        success: true,
        traceId: req.headers["x-trace-id"],
        available,
        remainingSpots: maxAttendees - bookingCount,
      });
    } catch (error) {
      logger.error("Failed to check availability: ", error);
      next(new AppError("Failed to check availability", error, 500));
    }
  }

  // Cancel booking
  static async cancelBooking(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    try {
      // Get booking details first to check date and status
      const existingBooking = await Booking.findById(id).populate("activityId");
      if (!existingBooking) {
        logger.warn(`Booking not found: ${id}`);
        next(new AppError("Booking not found", null, 404));
        return;
      }

      // Check if booking is already cancelled
      if (existingBooking.status === "cancelled") {
        logger.warn(`Booking already cancelled: ${id}`);
        next(new AppError("Booking is already cancelled", null, 400));
        return;
      }

      // Get activity date from populated booking
      const activityDate = (existingBooking.activityId as any).date;
      const currentDate = new Date();
      const hoursBeforeActivity =
        Math.abs(activityDate.getTime() - currentDate.getTime()) / 36e5; // 36e5 = 3600000 milliseconds in an hour
      console.log("hoursBeforeActivity", hoursBeforeActivity);
      // Check if cancellation is within allowed timeframe (e.g., 24 hours before activity)
      if (hoursBeforeActivity < 24) {
        logger.warn(`Cancellation attempt too close to activity: ${id}`);
        next(
          new AppError(
            "Cannot cancel booking less than 24 hours before activity start time",
            null,
            400
          )
        );
        return;
      }

      // Update booking status to cancelled
      existingBooking.status = BookingStatus.CANCELLED;
      if (
        existingBooking.paymentStatus === "completed" &&
        existingBooking.isConfirmed
      ) {
        existingBooking.paymentStatus = "refunded";
        // TODO: Integrate with payment provider to process refund
        // For now, just update the status
   
      }

      await existingBooking.save();

      logger.info(`Booking cancelled successfully: ${id}`);
      res.json({
        success: true,
        traceId: req.headers["x-trace-id"],
        message: "Booking cancelled successfully",
      });
    } catch (error) {
      logger.error(`Failed to cancel booking: ${error}`);
      next(new AppError("Failed to cancel booking", error, 500));
    }
  }
}
