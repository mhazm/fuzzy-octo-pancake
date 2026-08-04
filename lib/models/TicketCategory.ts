import mongoose from "mongoose";

const TicketCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.TicketCategory ||
  mongoose.model("TicketCategory", TicketCategorySchema);
