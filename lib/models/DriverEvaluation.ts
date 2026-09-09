import mongoose, { Schema, Document } from "mongoose";

export interface IDriverEvaluation extends Document {
  driverId: string; // Discord ID of the intern
  driverName: string;
  driverTruckyId?: number;
  channelId: string; // Discord Channel ID
  channelName: string;
  status: "active" | "closed";
  openedByManagerId: string;
  openedByManagerName: string;
  openedAt: Date;
  closedByManagerId?: string;
  closedByManagerName?: string;
  closeReason?: string;
  evaluationNotes?: string;
  closedAt?: Date;
  kpiAwarded?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const driverEvaluationSchema = new Schema<IDriverEvaluation>(
  {
    driverId: { type: String, required: true, index: true },
    driverName: { type: String, required: true },
    driverTruckyId: { type: Number },
    channelId: { type: String, required: true },
    channelName: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
      index: true,
    },
    openedByManagerId: { type: String, required: true, index: true },
    openedByManagerName: { type: String, required: true },
    openedAt: { type: Date, default: Date.now },
    closedByManagerId: { type: String, index: true },
    closedByManagerName: { type: String },
    closeReason: { type: String },
    evaluationNotes: { type: String },
    closedAt: { type: Date },
    kpiAwarded: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "driverevaluations",
  }
);

// Indeks gabungan untuk pencarian efisien
driverEvaluationSchema.index({ driverId: 1, status: 1 });
driverEvaluationSchema.index({ closedByManagerId: 1, status: 1, closedAt: 1 });

if (process.env.NODE_ENV !== "production") {
  delete mongoose.models.DriverEvaluation;
}

export default (mongoose.models.DriverEvaluation as mongoose.Model<IDriverEvaluation>) ||
  mongoose.model<IDriverEvaluation>("DriverEvaluation", driverEvaluationSchema);
