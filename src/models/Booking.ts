import { Document, Schema, model } from "mongoose";

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

interface IBooking extends Document {
  userId: Schema.Types.ObjectId;
  activityId: Schema.Types.ObjectId;
  date: Date;
  status: BookingStatus;
  paymentStatus: string;
  paymentId?: string;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  isConfirmed: boolean; // Confirmation status of the booking
}

const bookingSchema = new Schema<IBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
    },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(BookingStatus),
      default: BookingStatus.PENDING,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    isConfirmed: { type: Boolean, default: false },
    paymentId: { type: String },
    totalAmount: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

export const Booking = model<IBooking>("Booking", bookingSchema);
