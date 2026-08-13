import mongoose from "mongoose";

const fleetMaintenanceOrderSchema = new mongoose.Schema(
  {
    userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    discordId: { type: String, required: true },
    fleetId: { type: mongoose.Schema.Types.ObjectId, ref: "Fleet", required: true },
    type: {
      type: String,
      enum: ["maintenance", "replace"],
      default: "maintenance",
    },
    status: {
      type: String,
      enum: ["pending", "waiting", "in_service", "completed", "cancelled"],
      default: "pending",
    },
    managerId: { type: String, default: null },
    discordChannelId: { type: String, required: true },
    components: {
      engine: { type: Boolean, default: false },
      tires: { type: Boolean, default: false },
      transmission: { type: Boolean, default: false },
      brakes: { type: Boolean, default: false },
    },
    basePrice: { type: Number, required: true },
    adminFee: { type: Number, required: true, default: 500 },
    totalPrice: { type: Number, required: true },
    serviceDuration: { type: Number, required: true }, // in days
    slotNumber: { type: Number, default: null }, // 1, 2, or 3
    maintenanceStartAt: { type: Date, default: null },
    maintenanceEndAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.FleetMaintenanceOrder || mongoose.model("FleetMaintenanceOrder", fleetMaintenanceOrderSchema);
