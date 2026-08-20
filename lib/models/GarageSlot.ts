import mongoose from "mongoose";

const garageSlotSchema = new mongoose.Schema(
  {
    slotId: { type: String, required: true, unique: true }, // e.g. "ets2-reg-1"
    game_id: { type: String, enum: ["ets2", "ats"], required: true },
    type: { type: String, enum: ["regular", "vip"], default: "regular" },
    condition: { type: Number, default: 100 }, // 0 - 100
    status: {
      type: String,
      enum: ["available", "in_use", "broken"],
      default: "available",
    },
    currentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FleetMaintenanceOrder",
      default: null,
    },
    fleetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fleet",
      default: null,
    },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.GarageSlot;
}

export default mongoose.models.GarageSlot || mongoose.model("GarageSlot", garageSlotSchema);
