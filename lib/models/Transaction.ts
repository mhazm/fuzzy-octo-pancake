import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  trxId: { type: String, required: true, unique: true },
  discordId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  category: { 
    type: String, 
    enum: ["fleet", "maintenance", "nismaraplus", "market", "others"],
    required: true 
  },
  amount: { type: Number, required: true },
  currency: { 
    type: String, 
    enum: ["NC", "IDR"], 
    required: true,
    default: "NC"
  },
  status: { 
    type: String, 
    enum: ["pending", "success", "failed"], 
    default: "success" 
  },
  metadata: { type: Object, default: {} }
}, { timestamps: true });

// Avoid compiling model multiple times
const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", TransactionSchema);

export default Transaction;
