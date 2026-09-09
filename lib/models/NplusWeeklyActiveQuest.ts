import mongoose from "mongoose";
import { IQuestReward } from "./NplusQuestTemplate";

export interface IActiveQuestItem {
  templateId?: mongoose.Types.ObjectId | string;
  title: string;
  description: string;
  type: "TOTAL_JOBS" | "HEAVY_CARGO" | "LONG_HAUL" | "TOTAL_DISTANCE" | "PERFECT_DELIVERY" | "HARDCORE_JOB" | "TRUCKERSMP_JOB";
  target: number;
  minCargoMass?: number;
  minDistanceKm?: number;
  reward: IQuestReward;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface INplusWeeklyActiveQuest {
  _id?: mongoose.Types.ObjectId;
  weekKey: string; // e.g. "2026-W36"
  year: number;
  weekNumber: number;
  startDate: Date; // Monday 00:00:00 WIB
  endDate: Date; // Sunday 23:59:59 WIB
  quests: IActiveQuestItem[];
  isManualOverride: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const activeQuestItemSchema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "NplusQuestTemplate" },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ["TOTAL_JOBS", "HEAVY_CARGO", "LONG_HAUL", "TOTAL_DISTANCE", "PERFECT_DELIVERY", "HARDCORE_JOB", "TRUCKERSMP_JOB"],
      required: true,
    },
    target: { type: Number, required: true },
    minCargoMass: { type: Number, default: 0 },
    minDistanceKm: { type: Number, default: 0 },
    reward: {
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
    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD"],
      default: "MEDIUM",
    },
  },
  { _id: true }
);

const nplusWeeklyActiveQuestSchema = new mongoose.Schema(
  {
    weekKey: { type: String, required: true, unique: true, index: true },
    year: { type: Number, required: true },
    weekNumber: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    quests: { type: [activeQuestItemSchema], required: true },
    isManualOverride: { type: Boolean, default: false },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.NplusWeeklyActiveQuest;
}

export default mongoose.models.NplusWeeklyActiveQuest ||
  mongoose.model("NplusWeeklyActiveQuest", nplusWeeklyActiveQuestSchema);
