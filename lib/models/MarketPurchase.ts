import mongoose from "mongoose";

const marketPurchaseSchema = new mongoose.Schema(
  {
    buyerId: { type: String, required: true, index: true },
    marketItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketItem",
      required: true,
    },
    pricePaid: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Satu user hanya bisa beli item yang sama sekali
marketPurchaseSchema.index({ buyerId: 1, marketItemId: 1 }, { unique: true });

if (mongoose.models.MarketPurchase) {
  delete mongoose.models.MarketPurchase;
}

export default mongoose.model("MarketPurchase", marketPurchaseSchema);
