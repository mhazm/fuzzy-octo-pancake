import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
  discordId: { type: String, required: true },
  contributed: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
});

const achievementRewardItemSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  name: { type: String },
  description: { type: String },
  imageUrl: { type: String }, // R2 URL setelah diupload
  codeId: { type: String },   // auto-generated saat goal completed
}, { _id: false });

const communityGoalSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, unique: true },
  description: { type: String, required: true },
  imageUrl: { type: String },
  creatorId: { type: String, required: true }, // discordId of the proposer
  type: { type: String, enum: ["nc", "km"], required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ["pending", "active", "completed", "failed", "rejected"], 
    default: "pending" 
  },
  rewardType: { type: String, enum: ["currency-boost", "coupon", "special-contract"], required: true },
  rewardDetails: { type: mongoose.Schema.Types.Mixed }, // e.g. { multiplier: 2, ... }
  achievementRewards: {
    participant: { type: achievementRewardItemSchema, default: () => ({ enabled: false }) },
    topContributor: { type: achievementRewardItemSchema, default: () => ({ enabled: false }) },
  },
  participants: [participantSchema],
  discordChannelId: { type: String },
  deadline: { type: Date, required: true },
  activatedAt: { type: Date }, // when manager approved the goal
  lastJobSyncAt: { type: Date }, // only used for 'km' goals
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});



export default mongoose.models.CommunityGoal || mongoose.model("CommunityGoal", communityGoalSchema);
