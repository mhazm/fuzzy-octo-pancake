import mongoose from "mongoose";

const fleetOrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    discordId: { type: String, required: true },
    fleetStoreId: { type: mongoose.Schema.Types.ObjectId, ref: "FleetStore", required: true },
    status: {
      type: String,
      enum: ["pending", "claimed", "completed", "cancelled"],
      default: "pending",
    },
    managerId: { type: String, default: null }, // Discord ID of the manager who claimed this order
    discordChannelId: { type: String, required: true }, // ID of the temporary Discord ticket channel
    basePrice: { type: Number, required: true },
    adminFee: { type: Number, required: true, default: 500 },
    nismaraPlusDiscount: { type: Number, default: 0 },
    boosterDiscount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    requiresGarageUpgrade: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.FleetOrder || mongoose.model("FleetOrder", fleetOrderSchema);
