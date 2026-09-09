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
      enum: ["pending", "processing", "waiting", "in_service", "completed", "cancelled"],
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
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: "UserVoucher", default: null },
    voucherDiscount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    serviceDuration: { type: Number, required: true }, // in days
    slotNumber: { type: String, default: null }, // e.g. "ets2-vip-1", "ets2-reg-2"
    maintenanceStartAt: { type: Date, default: null },
    maintenanceEndAt: { type: Date, default: null },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.FleetMaintenanceOrder;
}

export default mongoose.models.FleetMaintenanceOrder || mongoose.model("FleetMaintenanceOrder", fleetMaintenanceOrderSchema);
