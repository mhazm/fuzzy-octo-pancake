import mongoose from "mongoose";

const garageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    discordId: { type: String, required: true },
    fleetSlot: { type: Number, required: true, default: 1 },
    fleetSlotUsed: { type: Number, required: true, default: 0 },
    fleetSlotLevel: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: ["operational", "closed", "on_construction"],
      default: "operational",
    },
    operational_cost: { type: Number, required: true, default: 0 },
    next_payment_date: { type: Date, default: null },
    mechanics: {
      umum: {
        name: { type: String, default: null },
        level: { type: Number, default: null },
        boostPercentage: { type: Number, default: null },
        salary: { type: Number, default: null },
        extendAt: { type: Date, default: null },
      },
      ban: {
        name: { type: String, default: null },
        level: { type: Number, default: null },
        boostPercentage: { type: Number, default: null },
        salary: { type: Number, default: null },
        extendAt: { type: Date, default: null },
      },
      mesin: {
        name: { type: String, default: null },
        level: { type: Number, default: null },
        boostPercentage: { type: Number, default: null },
        salary: { type: Number, default: null },
        extendAt: { type: Date, default: null },
      }
    },
  },
  { timestamps: true },
);

export default mongoose.models.Garage || mongoose.model("Garage", garageSchema);
