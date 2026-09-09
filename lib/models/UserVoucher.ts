import mongoose from "mongoose";

const userVoucherSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    discordId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, default: process.env.DISCORD_GUILD_ID || "863959415702028318" },
    code: { type: String, required: true, unique: true, uppercase: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: {
      type: String,
      enum: ["FLEET_MAINTENANCE", "FLEET_BUY", "MARKET_MOD", "GARAGE_UPGRADE", "NC_BOOSTER"],
      required: true,
      index: true,
    },
    durationHours: { type: Number, default: 0 }, // For NC_BOOSTER (e.g. 2, 6, 12, 24 hours)
    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
      default: "percentage",
    },
    discountValue: { type: Number, required: true }, // 100 for 100%, 50 for 50%, or 5000 for 5000 NC
    maxDiscount: { type: Number, default: 0 }, // 0 = unlimited
    minSpend: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ACTIVE", "USED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },
    source: { type: String, default: "SEASONAL_PASS" }, // e.g. SEASONAL_PASS_S1, EVENT, ADMIN_GRANT
    expiresAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
    usedOrderId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.UserVoucher;
}

export default mongoose.models.UserVoucher || mongoose.model("UserVoucher", userVoucherSchema);
