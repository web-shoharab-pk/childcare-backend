import { Request, Response } from "express";
import { envConfig } from "../config/environment";
import { stripe } from "../config/stripe";
import { Booking, BookingStatus } from "../models/Booking";
import { sendBookingConfirmation } from "../utils/email";
import logger from "../utils/logger";

const endpointSecret = envConfig.STRIPE_WEBHOOK_SECRET;

export const webhookHandler = async (request: Request, response: Response) => {
  const sig = request.headers["stripe-signature"] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err: any) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    response
      .status(400)
      .send(`Webhook Error: ${err.message}`)
      .json({ ...request });
    return;
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // Find the booking associated with this session
    let bookingId = session.metadata ? session.metadata.bookingId : undefined;
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
  } else {
    logger.info(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.status(200).send();
};
