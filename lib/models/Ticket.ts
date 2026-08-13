import mongoose from "mongoose";

const TicketSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    userId: { type: String, required: true }, // Mongoose ObjectId of the user (or string)
    discordId: { type: String, required: true }, // Creator's Discord ID
    managerId: { type: String, default: null }, // Handler's Discord ID
    discordChannelId: { type: String, required: true },
    categoryId: { type: String, required: true },
    categoryName: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "claimed", "resolved", "rejected"],
      default: "open",
    },
    closingReason: { type: String, default: null },
    rating: { type: Number, default: 0 }, // 1-5 rating
    tipAmount: { type: Number, default: 0 },
    hasTipped: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Ticket || mongoose.model("Ticket", TicketSchema);
