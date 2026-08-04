import mongoose from "mongoose";

const fleetBrandSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    logo_url: { type: String, required: false },
  },
  { timestamps: true },
);

export default mongoose.models.FleetBrand ||
  mongoose.model("FleetBrand", fleetBrandSchema);
