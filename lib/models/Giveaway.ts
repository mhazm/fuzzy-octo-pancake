import mongoose from "mongoose";

export interface GiveawayRewardItem {
  type: "NC" | "FUEL" | "SAFEBOX_TICKET" | "VOUCHER" | "NPLUS_TRIAL" | "MOD_LIVERY" | "CUSTOM";
  title: string;
  description?: string;
  amount?: number;
  voucherCategory?: "FLEET_MAINTENANCE" | "FLEET_BUY" | "NC_BOOSTER" | "MARKET_MOD" | "GARAGE_UPGRADE";
  voucherDiscountType?: "percentage" | "fixed";
  voucherDiscountValue?: number;
  voucherDurationHours?: number;
  voucherExpireDays?: number;
  imageUrl?: string;
}

export interface GiveawayPrizeTier {
  tier: number;
  tierTitle: string;
  winnerCount: number;
  rewards: GiveawayRewardItem[];
}

export interface GiveawayQuestConfig {
  questId: string;
  title: string;
  description: string;
  type: "TOTAL_JOBS" | "LONG_HAUL" | "TRUCKERSMP_JOB" | "HEAVY_CARGO" | "PERFECT_DELIVERY";
  target: number;
  minDistanceKm?: number;
  minCargoMass?: number;
  rewardTickets: number;
}

export interface GiveawayWinner {
  tier: number;
  tierTitle: string;
  discordId: string;
  name: string;
  avatarUrl?: string;
  ticketNumber: string;
  rewards: GiveawayRewardItem[];
  drawnAt: Date;
}

export interface IGiveaway {
  _id?: string;
  title: string;
  slug: string;
  description: string;
  bannerUrl?: string;
  startDate: Date;
  endDate: Date;
  drawDate?: Date;
  status: "draft" | "scheduled" | "ongoing" | "drawing" | "completed" | "cancelled";
  allowMultipleWins: boolean;
  enableQuests: boolean;
  quests: GiveawayQuestConfig[];
  enableNcPurchase: boolean;
  ticketPriceNC: number;
  maxPurchasableTickets: number; // 0 = unlimited
  discountNPlusAndBooster: number; // 20%
  prizes: GiveawayPrizeTier[];
  winners: GiveawayWinner[];
  stats: {
    totalTickets: number;
    totalParticipants: number;
    totalNcBurned: number;
  };
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const rewardItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["NC", "FUEL", "SAFEBOX_TICKET", "VOUCHER", "NPLUS_TRIAL", "MOD_LIVERY", "CUSTOM"],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    voucherCategory: { type: String, default: null },
    voucherDiscountType: { type: String, default: null },
    voucherDiscountValue: { type: Number, default: 0 },
    voucherDurationHours: { type: Number, default: 0 },
    voucherExpireDays: { type: Number, default: 30 },
    imageUrl: { type: String, default: null },
  },
  { _id: false }
);

const prizeTierSchema = new mongoose.Schema(
  {
    tier: { type: Number, required: true },
    tierTitle: { type: String, required: true },
    winnerCount: { type: Number, required: true, default: 1 },
    rewards: [rewardItemSchema],
  },
  { _id: false }
);

const questConfigSchema = new mongoose.Schema(
  {
    questId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["TOTAL_JOBS", "LONG_HAUL", "TRUCKERSMP_JOB", "HEAVY_CARGO", "PERFECT_DELIVERY"],
      required: true,
    },
    target: { type: Number, required: true, default: 1 },
    minDistanceKm: { type: Number, default: null },
    minCargoMass: { type: Number, default: null },
    rewardTickets: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

const winnerSchema = new mongoose.Schema(
  {
    tier: { type: Number, required: true },
    tierTitle: { type: String, required: true },
    discordId: { type: String, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String, default: null },
    ticketNumber: { type: String, required: true },
    rewards: [rewardItemSchema],
    drawnAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const giveawaySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: "" },
    bannerUrl: { type: String, default: null },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    drawDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["draft", "scheduled", "ongoing", "drawing", "completed", "cancelled"],
      default: "draft",
      index: true,
    },
    allowMultipleWins: { type: Boolean, default: false },
    enableQuests: { type: Boolean, default: true },
    quests: [questConfigSchema],
    enableNcPurchase: { type: Boolean, default: true },
    ticketPriceNC: { type: Number, default: 1000 },
    maxPurchasableTickets: { type: Number, default: 5 },
    discountNPlusAndBooster: { type: Number, default: 20 },
    prizes: [prizeTierSchema],
    winners: [winnerSchema],
    stats: {
      totalTickets: { type: Number, default: 0 },
      totalParticipants: { type: Number, default: 0 },
      totalNcBurned: { type: Number, default: 0 },
    },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.Giveaway;
}

export default mongoose.models.Giveaway || mongoose.model("Giveaway", giveawaySchema);
