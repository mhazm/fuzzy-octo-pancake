import mongoose from "mongoose";

const lottoTicketSchema = new mongoose.Schema(
  {
    periodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LottoPeriod",
      required: true,
    },
    discordId: { type: String, required: true },
    numbers: {
      type: [Number],
      required: true,
      validate: [
        (arr: number[]) => arr.length === 4,
        "Numbers must contain exactly 4 numbers",
      ],
    },
    status: {
      type: String,
      enum: ["PENDING", "WIN_TIER_1", "WIN_TIER_2", "WIN_TIER_3", "LOSE"],
      default: "PENDING",
    },
    prizeWon: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.LottoTicket ||
  mongoose.model("LottoTicket", lottoTicketSchema);
