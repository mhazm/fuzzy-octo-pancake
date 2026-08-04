import mongoose from "mongoose";

const marketReviewSchema = new mongoose.Schema(
  {
    marketItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MarketItem", required: true },
    buyerId: { type: String, required: true }, // discordId
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
  },
  { timestamps: true },
);

marketReviewSchema.index({ marketItemId: 1, buyerId: 1 }, { unique: true });

if (mongoose.models.MarketReview) {
  delete mongoose.models.MarketReview;
}

export default mongoose.model("MarketReview", marketReviewSchema);
