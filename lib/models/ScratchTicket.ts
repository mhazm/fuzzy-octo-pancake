import mongoose from "mongoose";

const scratchTicketSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true },
    price: { type: Number, default: 400 },
    prizeWon: { type: Number, default: 0 },
    isWinning: { type: Boolean, default: false },
    isScratched: { type: Boolean, default: false },
    scratchedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.ScratchTicket ||
  mongoose.model("ScratchTicket", scratchTicketSchema);
