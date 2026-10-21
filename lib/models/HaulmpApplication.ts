import mongoose, { Schema, Document } from "mongoose";

export interface IHaulmpApplication extends Document {
  discordId: string;
  name: string;
  truckyId?: string | number;
  status: "pending" | "approved" | "rejected";
  notes?: string;
  channelId?: string;
  discordChannelId?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string; // manager discordId
  reviewerName?: string; // manager name
  reviewReason?: string;
}

const haulmpApplicationSchema = new Schema<IHaulmpApplication>(
  {
    discordId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    truckyId: { type: Schema.Types.Mixed, required: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    notes: { type: String, default: "" },
    channelId: { type: String, default: null },
    discordChannelId: { type: String, default: null },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null },
    reviewerName: { type: String, default: null },
    reviewReason: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.HaulmpApplication ||
  mongoose.model<IHaulmpApplication>("HaulmpApplication", haulmpApplicationSchema, "haulmp_applications");
