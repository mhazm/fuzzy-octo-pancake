import mongoose from "mongoose";
import { RewardItem, SeasonLevelConfig } from "./SeasonPass";

export interface ISeasonPassTemplate {
  _id?: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  totalXp: number;
  levels: SeasonLevelConfig[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const rewardItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "NC",
        "FUEL",
        "SAFEBOX_TICKET",
        "VOUCHER",
        "NPLUS_TRIAL",
        "BADGE",
        "DISCORD_ROLE",
        "MOD_LIVERY",
        "DOWNLOADABLE",
        "PHYSICAL_MERCH",
        "PHYSICAL",
        "CUSTOM",
      ],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    voucherCategory: { type: String, default: null },
    voucherDiscountType: { type: String, default: null },
    voucherDiscountValue: { type: Number, default: 0 },
    voucherDurationHours: { type: Number, default: 0 },
    badgeId: { type: String, default: null },
    badgeName: { type: String, default: null },
    iconName: { type: String, default: null },
    imageUrl: { type: String, default: null },
  },
  { _id: false }
);

const seasonLevelSchema = new mongoose.Schema(
  {
    level: { type: Number, required: true },
    xpRequired: { type: Number, required: true },
    cumulativeXp: { type: Number, required: true },
    freeRewards: [rewardItemSchema],
    premiumRewards: [rewardItemSchema],
  },
  { _id: false }
);

const seasonPassTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
    totalXp: { type: Number, required: true, default: 250000 },
    levels: [seasonLevelSchema],
    createdBy: { type: String, default: "Manager" },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.SeasonPassTemplate;
}

export default mongoose.models.SeasonPassTemplate ||
  mongoose.model("SeasonPassTemplate", seasonPassTemplateSchema);
