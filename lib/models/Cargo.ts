import mongoose from "mongoose";

const cargoSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    in_game_id: { type: String, required: true },
    game_id: { type: Number, required: true },
    adr_class: { type: Number },
    fragility: { type: Number },
    mass: { type: Number },
    volume: { type: Number },
    unit_reward_per_km: { type: Number },
    overweight: { type: Boolean },
    groups: Array,
    body_types: Array,
    valuable: { type: Boolean },
    market_demand: { type: Number },
    difference: { type: Number },
    enabled: { type: Boolean },
    job_count: { type: Number },
    price_per_km: { type: Number },
    price_per_km_with_market_change: { type: Number },
    is_fragile: { type: Boolean },
  },
  { timestamps: true },
);

export default mongoose.models.Cargo || mongoose.model("Cargo", cargoSchema);
