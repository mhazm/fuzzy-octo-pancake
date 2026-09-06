import mongoose, { Schema, Document, models, model } from "mongoose";

export interface ISystemSetting extends Document {
  key: string;
  value: any;
  description?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const systemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production") {
  delete models.SystemSetting;
}

export default (models.SystemSetting as mongoose.Model<ISystemSetting>) ||
  model<ISystemSetting>("SystemSetting", systemSettingSchema);
