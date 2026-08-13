import mongoose from "mongoose";

const racingTicketSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
  },
  truckId: {
    type: Number,
    required: true,
  },
  winningTruckId: {
    type: Number,
    required: true,
  },
  multiplier: {
    type: Number,
    required: true,
  },
  betAmount: {
    type: Number,
    required: true,
  },
  prizeWon: {
    type: Number,
    required: true,
  },
  isWinning: {
    type: Boolean,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const RacingTicket = mongoose.models.RacingTicket || mongoose.model("RacingTicket", racingTicketSchema);

export default RacingTicket;
