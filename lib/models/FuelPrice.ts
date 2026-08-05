import mongoose from "mongoose";

const fuelPriceSchema = new mongoose.Schema(
  {
    price: { type: Number, required: true }, // Harga dalam NC per liter (0.1 - 0.8)
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.FuelPrice || mongoose.model("FuelPrice", fuelPriceSchema);
