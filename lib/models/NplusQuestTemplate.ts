import mongoose from "mongoose";

export interface IQuestReward {
  type: "VOUCHER" | "NC" | "SAFEBOX_TICKET" | "FUEL";
  title: string;
  amount?: number;
  // Khusus Voucher
  voucherCategory?: "FLEET_MAINTENANCE" | "FLEET_BUY" | "MARKET_MOD" | "GARAGE_UPGRADE" | "NC_BOOSTER";
  voucherDiscountType?: "percentage" | "fixed";
  voucherDiscountValue?: number;
  voucherDurationHours?: number;
  description?: string;
}

export interface INplusQuestTemplate {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: "TOTAL_JOBS" | "HEAVY_CARGO" | "LONG_HAUL" | "TOTAL_DISTANCE" | "PERFECT_DELIVERY" | "HARDCORE_JOB" | "TRUCKERSMP_JOB";
  target: number;
  minCargoMass?: number; // Ton (misal 20)
  minDistanceKm?: number; // KM (misal 1000)
  reward: IQuestReward;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  isActive: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const questRewardSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["VOUCHER", "NC", "SAFEBOX_TICKET", "FUEL"],
      required: true,
    },
    title: { type: String, required: true },
    amount: { type: Number, default: 0 },
    voucherCategory: {
      type: String,
      enum: ["FLEET_MAINTENANCE", "FLEET_BUY", "MARKET_MOD", "GARAGE_UPGRADE", "NC_BOOSTER"],
    },
    voucherDiscountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    voucherDiscountValue: { type: Number, default: 0 },
    voucherDurationHours: { type: Number, default: 0 },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const nplusQuestTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["TOTAL_JOBS", "HEAVY_CARGO", "LONG_HAUL", "TOTAL_DISTANCE", "PERFECT_DELIVERY", "HARDCORE_JOB", "TRUCKERSMP_JOB"],
      required: true,
      index: true,
    },
    target: { type: Number, required: true },
    minCargoMass: { type: Number, default: 0 },
    minDistanceKm: { type: Number, default: 0 },
    reward: { type: questRewardSchema, required: true },
    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD"],
      default: "MEDIUM",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.NplusQuestTemplate;
}

export default mongoose.models.NplusQuestTemplate ||
  mongoose.model("NplusQuestTemplate", nplusQuestTemplateSchema);
