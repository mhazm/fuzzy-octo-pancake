import mongoose from "mongoose";

const fuelTransactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["system", "p2p"], required: true },
    buyerDiscordId: { type: String, required: true },
    buyerName: { type: String, required: true },
    sellerDiscordId: { type: String, default: null }, // Null jika dari sistem
    sellerName: { type: String, default: null }, // "Sistem" jika dari sistem
    amount: { type: Number, required: true }, // Liter
    pricePerLiter: { type: Number, required: true }, // NC/Liter
    totalPrice: { type: Number, required: true }, // Total NC yang dipotong dari buyer (termasuk fee jika ada)
    fee: { type: Number, default: 0 }, // Fee yang ditahan sistem
  },
  { timestamps: true }
);

export default mongoose.models.FuelTransaction || mongoose.model("FuelTransaction", fuelTransactionSchema);
