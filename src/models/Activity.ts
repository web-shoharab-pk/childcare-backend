import { Document, Schema, model } from "mongoose";

interface IActivity extends Document {
  name: string;
  description: string;
  date: Date;
  attendees: string[]; // Array of user IDs
  location: string;
  createdBy: Schema.Types.ObjectId;
}

const activitySchema = new Schema<IActivity>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    attendees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    location: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  },
  { timestamps: true }
);

export const Activity = model<IActivity>("Activity", activitySchema);
