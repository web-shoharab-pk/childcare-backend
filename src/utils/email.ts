import nodemailer from "nodemailer";
import { envConfig } from "../config/envConfig";

// Set up the transporter
const transporter = nodemailer.createTransport({
  service: envConfig.SMPT_SERVICE,
  host: "smtp.gmail.com",
  port: 465, // Port 465 for secure SSL/TLS connection
  secure: true, // Secure connection (true for port 465)
  auth: {
    user: envConfig.SMPT_MAIL,
    pass: envConfig.SMPT_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // Accept self-signed certificates if necessary
  },
});

export async function sendBookingConfirmation(booking: any) {
  const mailOptions = {
    from: envConfig.SMPT_MAIL,
    to: booking.userId.email,
    subject: "Booking Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; border-radius: 8px;">
        <h1 style="color: #4CAF50;">🎉 Booking Confirmed!</h1>
        <p style="font-size: 16px;">Your booking has been confirmed for <strong>${new Date(
          booking.date
        ).toLocaleString()}</strong>.</p>
        <h2 style="color: #333;">Booking Details:</h2>
        <ul style="list-style-type: none; padding: 0;">
          <li style="padding: 10px; background: #fff; border-radius: 5px; margin-bottom: 10px;">
            <strong>Activity:</strong> ${booking.activityId.name}
          </li>
          <li style="padding: 10px; background: #fff; border-radius: 5px; margin-bottom: 10px;">
            <strong>Date:</strong> ${new Date(
              booking.date
            ).toLocaleDateString()}
          </li>
          <li style="padding: 10px; background: #fff; border-radius: 5px; margin-bottom: 10px;">
            <strong>Time:</strong> ${new Date(
              booking.date
            ).toLocaleTimeString()}
          </li>
          <li style="padding: 10px; background: #fff; border-radius: 5px; margin-bottom: 10px;">
            <strong>Total Amount:</strong> <span style="color: #4CAF50;">$${
              booking.totalAmount
            }</span>
          </li>
        </ul>
        <p style="font-size: 14px; color: #777;">Thank you for choosing our service!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
