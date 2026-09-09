import mongoose from "mongoose";

export interface RewardItem {
  type: "NC" | "FUEL" | "SAFEBOX_TICKET" | "VOUCHER" | "NPLUS_TRIAL" | "BADGE" | "DISCORD_ROLE" | "MOD_LIVERY" | "DOWNLOADABLE" | "PHYSICAL_MERCH" | "PHYSICAL" | "CUSTOM";
  title: string;
  description?: string;
  amount?: number; // For NC, Fuel, Safebox Ticket, or NPlus Trial Days
  voucherCategory?: "FLEET_MAINTENANCE" | "FLEET_BUY" | "NC_BOOSTER" | "MARKET_MOD" | "GARAGE_UPGRADE";
  voucherDiscountType?: "percentage" | "fixed";
  voucherDiscountValue?: number; // e.g. 25, 50, 100
  voucherDurationHours?: number; // For NC Booster (e.g. 2, 6, 12, 24)
  badgeId?: string; // e.g. "s1_bronze", "s1_silver", "s1_master", "s1_champion"
  badgeName?: string;
  iconName?: string;
  imageUrl?: string;
}

export interface SeasonLevelConfig {
  level: number;
  xpRequired: number; // XP to complete this level
  cumulativeXp: number; // Total XP required up to this level
  freeRewards: RewardItem[];
  premiumRewards: RewardItem[];
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

const seasonPassSchema = new mongoose.Schema(
  {
    seasonNumber: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: "" },
    theme: { type: String, default: "default" },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "COMPLETED"],
      default: "ACTIVE",
      index: true,
    },
    totalXp: { type: Number, required: true, default: 250000 },
    weeklyCapXp: { type: Number, required: true, default: 20000 },
    finalRushWeeks: { type: Number, default: 2 }, // Last 2 weeks uncapped + double XP
    levels: [seasonLevelSchema],
    grandPrize: {
      title: { type: String, default: "Mod Livery Truk Eksklusif Season 1" },
      description: { type: String, default: "Livery resmi edisi terbatas Season 1 untuk truk Scania & Volvo" },
      type: {
        type: String,
        enum: ["MOD_LIVERY", "DOWNLOADABLE", "PHYSICAL_MERCH", "PHYSICAL"],
        default: "MOD_LIVERY",
      },
      downloadUrl: { type: String, default: "" },
      imageUrl: { type: String, default: "" },
    },
    premiumPriceIdr: { type: Number, default: 35000 },
    levelPriceIdr: { type: Number, default: 2000 },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.SeasonPass;
}

export default mongoose.models.SeasonPass ||
  mongoose.model("SeasonPass", seasonPassSchema);
