import mongoose, { Schema, Document } from "mongoose";

export interface ISeasonPassMerchClaim extends Document {
  discordId: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  seasonNumber: number;
  prizeTitle: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  shippingNotes?: string;
  channelId?: string;
  status: "pending" | "confirmed" | "shipped" | "completed" | "cancelled";
  resiNumber?: string;
  processedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SeasonPassMerchClaimSchema = new Schema<ISeasonPassMerchClaim>(
  {
    discordId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    seasonNumber: { type: Number, required: true, index: true },
    prizeTitle: { type: String, required: true },
    recipientName: { type: String, required: true },
    recipientPhone: { type: String, required: true },
    recipientAddress: { type: String, required: true },
    shippingNotes: { type: String, default: "" },
    channelId: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    resiNumber: { type: String, default: "" },
    processedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

// Compound index for 1 claim per user per season
SeasonPassMerchClaimSchema.index(
  { seasonNumber: 1, discordId: 1 },
  { unique: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.SeasonPassMerchClaim;
}

export default mongoose.models.SeasonPassMerchClaim ||
  mongoose.model<ISeasonPassMerchClaim>("SeasonPassMerchClaim", SeasonPassMerchClaimSchema);
