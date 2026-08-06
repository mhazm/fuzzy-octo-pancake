import mongoose from "mongoose";

const scratchTicketSchema = new mongoose.Schema(
  {
    discordId: { type: String, required: true },
    price: { type: Number, default: 400 },
    prizeWon: { type: Number, default: 0 },
    isWinning: { type: Boolean, default: false },
    isScratched: { type: Boolean, default: false },
    scratchedAt: { type: Date, default: null },
    ticketType: { type: String, default: "basic" }, // "basic" | "100x"
    gameData: { type: mongoose.Schema.Types.Mixed }, // Data grid/nomor untuk 100x
  },
  { timestamps: true }
);

export default mongoose.models.ScratchTicket ||
  mongoose.model("ScratchTicket", scratchTicketSchema);
