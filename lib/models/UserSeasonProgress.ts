import mongoose from "mongoose";

const userSeasonProgressSchema = new mongoose.Schema(
  {
    seasonNumber: { type: Number, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    discordId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, default: process.env.DISCORD_GUILD_ID || "863959415702028318" },
    currentXp: { type: Number, required: true, default: 0 },
    currentLevel: { type: Number, required: true, default: 0 },
    isPremium: { type: Boolean, default: false },
    purchasedAt: { type: Date, default: null },
    claimedFreeLevels: { type: [Number], default: [] }, // Array of level numbers claimed in Free Track
    claimedPremiumLevels: { type: [Number], default: [] }, // Array of level numbers claimed in Premium Track
    levelSkipsPurchased: { type: Number, default: 0 },
    merchClaim: {
      claimedAt: { type: Date, default: null },
      recipientName: { type: String, default: null },
      recipientPhone: { type: String, default: null },
      recipientAddress: { type: String, default: null },
      shippingNotes: { type: String, default: null },
      channelId: { type: String, default: null },
      status: {
        type: String,
        enum: ["pending", "confirmed", "shipped", "completed", "cancelled"],
        default: "pending",
      },
      resiNumber: { type: String, default: null },
    },
    // Weekly XP Tracking for audits
    weeklyXpLogs: [
      {
        weekNumber: { type: Number, required: true },
        xpGained: { type: Number, required: true, default: 0 },
        lastUpdated: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Compound index for unique season progress per user
userSeasonProgressSchema.index(
  { seasonNumber: 1, discordId: 1 },
  { unique: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.UserSeasonProgress;
}

export default mongoose.models.UserSeasonProgress ||
  mongoose.model("UserSeasonProgress", userSeasonProgressSchema);
