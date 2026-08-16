import mongoose from "mongoose";

const marketItemSchema = new mongoose.Schema(
  {
    sellerId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, default: 0 },
    categories: [
      {
        type: String,
        enum: [
          "vehicle",
          "trailer",
          "map",
          "sound",
          "vehicle_part",
          "skin",
          "other",
        ],
      },
    ],
    slug: { type: String, required: true, unique: true },
    game_id: { type: Number, required: true }, // 1 = ETS2, 2 = ATS
    game_version: { type: String }, // e.g. "1.50"
    download_url: { type: String, required: true }, // Link eksternal
    image_url: { type: String }, // Link R2 (Legacy/Main image)
    images: [{ type: String }], // Array of R2 Links (up to 3)
    isPublished: { type: Boolean, default: false }, // Will be true when approved
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "takedown"],
      default: "pending",
    },
    rejectReason: { type: String, default: null },
    discordChannelId: { type: String, default: null },
    reviewerId: { type: String, default: null },
    reviewerName: { type: String, default: null },
  },
  { timestamps: true },
);

// Prevent model caching during hot reloads
if (mongoose.models.MarketItem) {
  delete mongoose.models.MarketItem;
}

export default mongoose.model("MarketItem", marketItemSchema);
