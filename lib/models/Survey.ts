import mongoose, { Schema, Document, model, models } from "mongoose";

export interface IQuestion {
  questionText: string;
  type: "text" | "radio" | "checkbox";
  options: string[]; // Disimpan sebagai array string murni di MongoDB agar efisien
  required: boolean;
}

export interface ISurvey extends Document {
  title: string;
  uri: string;
  description: string;
  rewardNC: number;
  questions: IQuestion[];
  active: boolean;
  createdBy: string; // discordId manager pembuat
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionText: { type: String, required: true },
  type: { type: String, enum: ["text", "radio", "checkbox"], required: true },
  options: { type: [String], default: [] },
  required: { type: Boolean, default: true },
});

const SurveySchema = new Schema<ISurvey>(
  {
    title: { type: String, required: true },
    uri: { type: String, required: true },
    description: { type: String, required: true },
    rewardNC: { type: Number, default: 0 },
    questions: { type: [QuestionSchema], required: true },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

export const Survey = models.Survey || model<ISurvey>("Survey", SurveySchema);
