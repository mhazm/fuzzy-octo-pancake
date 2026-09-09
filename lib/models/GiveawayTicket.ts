import mongoose from "mongoose";

export interface IGiveawayTicket {
  _id?: string;
  giveawayId: mongoose.Types.ObjectId | string;
  discordId: string;
  ticketNumber: string;
  sourceType: "QUEST" | "NC_PURCHASE" | "ADMIN_GRANT";
  questId?: string;
  costNC?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const giveawayTicketSchema = new mongoose.Schema(
  {
    giveawayId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Giveaway",
      required: true,
      index: true,
    },
    discordId: {
      type: String,
      required: true,
      index: true,
    },
    ticketNumber: {
      type: String,
      required: true,
    },
    sourceType: {
      type: String,
      enum: ["QUEST", "NC_PURCHASE", "ADMIN_GRANT"],
      required: true,
      default: "QUEST",
    },
    questId: {
      type: String,
      default: null,
    },
    costNC: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Mencegah duplikasi nomor tiket di dalam giveaway yang sama
giveawayTicketSchema.index({ giveawayId: 1, ticketNumber: 1 }, { unique: true });

// Mempercepat pencarian tiket milik user
giveawayTicketSchema.index({ giveawayId: 1, discordId: 1 });

// Mencegah klaim ganda untuk quest yang sama oleh user yang sama di giveaway yang sama
giveawayTicketSchema.index(
  { giveawayId: 1, discordId: 1, questId: 1 },
  {
    unique: true,
    partialFilterExpression: { questId: { $type: "string" } },
  }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.GiveawayTicket;
}

export default mongoose.models.GiveawayTicket || mongoose.model("GiveawayTicket", giveawayTicketSchema);
