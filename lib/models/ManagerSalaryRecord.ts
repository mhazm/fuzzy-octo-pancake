import mongoose, { Schema, Document } from "mongoose";

export interface IManagerSalaryRecord extends Document {
  month: string; // Format "YYYY-MM" (e.g. "2026-08")
  managerId: string; // Discord ID
  guildId: string;
  status: "UNCLAIMED" | "PROCESSING" | "CLAIMED";
  baseSalary: number; // Base NC (default 10,000)
  totalPoints: number;
  unlockedTiers: number[];
  breakdown: {
    ticketsHandled: number;
    fleetOrdersHandled: number;
    fleetServicesHandled: number;
    convoysHosted: number;
    convoyParticipants: number;
    contractsCreated: number;
    boostEventsCreated: number;
    modsReviewed: number;
    distanceKm: number;
    distancePoints: number;
    internPromotionsHandled?: number;
    internPromotionPoints?: number;
    internEvaluationsHandled?: number;
    internEvaluationPoints?: number;
  };
  rewardsGranted: {
    ncAmount: number;
    vouchers: Array<{
      code: string;
      title: string;
      category: string;
      discountValue: number;
      discountType: string;
    }>;
    penaltyTickets: number;
  };
  claimedAt?: Date | null;
  claimedTrxId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const managerSalaryRecordSchema = new Schema<IManagerSalaryRecord>(
  {
    month: { type: String, required: true, index: true },
    managerId: { type: String, required: true, index: true },
    guildId: { type: String, required: true, default: process.env.DISCORD_GUILD_ID || "863959415702028318" },
    status: {
      type: String,
      enum: ["UNCLAIMED", "PROCESSING", "CLAIMED"],
      default: "UNCLAIMED",
      index: true,
    },
    baseSalary: { type: Number, default: 10000 },
    totalPoints: { type: Number, default: 0 },
    unlockedTiers: [{ type: Number }],
    breakdown: {
      ticketsHandled: { type: Number, default: 0 },
      fleetOrdersHandled: { type: Number, default: 0 },
      fleetServicesHandled: { type: Number, default: 0 },
      convoysHosted: { type: Number, default: 0 },
      convoyParticipants: { type: Number, default: 0 },
      contractsCreated: { type: Number, default: 0 },
      boostEventsCreated: { type: Number, default: 0 },
      modsReviewed: { type: Number, default: 0 },
      distanceKm: { type: Number, default: 0 },
      distancePoints: { type: Number, default: 0 },
      internPromotionsHandled: { type: Number, default: 0 },
      internPromotionPoints: { type: Number, default: 0 },
      internEvaluationsHandled: { type: Number, default: 0 },
      internEvaluationPoints: { type: Number, default: 0 },
    },
    rewardsGranted: {
      ncAmount: { type: Number, default: 0 },
      vouchers: [
        {
          code: { type: String },
          title: { type: String },
          category: { type: String },
          discountValue: { type: Number },
          discountType: { type: String },
        },
      ],
      penaltyTickets: { type: Number, default: 0 },
    },
    claimedAt: { type: Date, default: null },
    claimedTrxId: { type: String, default: null },
  },
  { timestamps: true }
);

managerSalaryRecordSchema.index({ month: 1, managerId: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.ManagerSalaryRecord;
}

export default (mongoose.models.ManagerSalaryRecord as mongoose.Model<IManagerSalaryRecord>) ||
  mongoose.model<IManagerSalaryRecord>("ManagerSalaryRecord", managerSalaryRecordSchema);
