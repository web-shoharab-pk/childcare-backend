import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../config/stripe";
import { Booking, BookingStatus } from "../models/Booking";
import { sendBookingConfirmation } from "../utils/email";
import logger from "../utils/logger";
import { envConfig } from "./../config/envConfig";

const endpointSecret = envConfig.STRIPE_WEBHOOK_SECRET as string;

export const webhookHandler = async (request: Request, response: Response) => {
  const sig = request.headers["stripe-signature"] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;

      // Find the booking associated with this session
      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        const booking = await Booking.findById(bookingId)
          .populate("userId")
          .populate("activityId");
        if (booking) {
          booking.isConfirmed = true;
          booking.status = BookingStatus.CONFIRMED;
          booking.paymentStatus = "completed";
          await booking.save();
          // Send booking confirmation email
          await sendBookingConfirmation(booking);
          logger.info(
            `Booking confirmed successfully: ${bookingId} - ${booking.id}`
          );
        }
      }

      // Add logic to update database, send email, etc.
      break;
    // Handle other event types
    default:
      logger.info(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.status(200).send();
};
