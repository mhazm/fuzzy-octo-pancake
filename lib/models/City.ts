import mongoose from "mongoose";

const citySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // Menambahkan unique index
    real_name: { type: String, required: true },
    x: { type: Number, required: true },
    z: { type: Number, required: true },
    game: { type: String, required: true },
    type: { type: String },
    country: { type: String },
    dlc: { type: String },
    mod: { type: String },
    in_game_id: { type: String },
  },
  { timestamps: true }
);

const City = mongoose.models.City || mongoose.model("City", citySchema);
export default City;
