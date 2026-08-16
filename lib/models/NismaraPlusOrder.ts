import mongoose, { Schema, Document } from "mongoose";

export interface INismaraPlusOrder extends Document {
  discordId: string;
  userId: mongoose.Types.ObjectId;
  durationMonths: number;
  amountIDR: number;
  type: "new" | "extend";
  channelId?: string;
  status: "pending" | "success" | "rejected";
  managerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NismaraPlusOrderSchema = new Schema<INismaraPlusOrder>(
  {
    discordId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    durationMonths: { type: Number, required: true },
    amountIDR: { type: Number, required: true },
    type: { type: String, enum: ["new", "extend"], required: true },
    channelId: { type: String },
    status: {
      type: String,
      enum: ["pending", "success", "rejected"],
      default: "pending",
    },
    managerId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.NismaraPlusOrder ||
  mongoose.model<INismaraPlusOrder>("NismaraPlusOrder", NismaraPlusOrderSchema);
