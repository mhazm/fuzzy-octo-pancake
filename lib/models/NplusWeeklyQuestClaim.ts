import mongoose from "mongoose";

export interface INplusWeeklyQuestClaim {
  _id?: mongoose.Types.ObjectId;
  discordId: string;
  userId: mongoose.Types.ObjectId;
  guildId: string;
  weekKey: string; // e.g. "2026-W36"
  questId: string; // _id of active quest item in NplusWeeklyActiveQuest
  claimedAt: Date;
  rewardSnapshot: {
    type: "VOUCHER" | "NC" | "SAFEBOX_TICKET" | "FUEL";
    title: string;
    amount?: number;
    voucherId?: mongoose.Types.ObjectId | string;
    details?: string;
  };
}

const nplusWeeklyQuestClaimSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    guildId: { type: String, required: true, default: process.env.DISCORD_GUILD_ID || "863959415702028318" },
    weekKey: { type: String, required: true, index: true },
    questId: { type: String, required: true, index: true },
    claimedAt: { type: Date, default: Date.now },
    rewardSnapshot: {
      type: { type: String, required: true },
      title: { type: String, required: true },
      amount: { type: Number, default: 0 },
      voucherId: { type: mongoose.Schema.Types.ObjectId, ref: "UserVoucher", default: null },
      details: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate claims for the same quest in the same week
nplusWeeklyQuestClaimSchema.index({ discordId: 1, weekKey: 1, questId: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.NplusWeeklyQuestClaim;
}

export default mongoose.models.NplusWeeklyQuestClaim ||
  mongoose.model("NplusWeeklyQuestClaim", nplusWeeklyQuestClaimSchema);
