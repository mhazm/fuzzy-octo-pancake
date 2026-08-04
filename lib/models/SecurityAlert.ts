import mongoose from "mongoose";

const securityAlertSchema = new mongoose.Schema({
  discordId: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  isResolved: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const SecurityAlert = mongoose.models.SecurityAlert || mongoose.model("SecurityAlert", securityAlertSchema);

export default SecurityAlert;
