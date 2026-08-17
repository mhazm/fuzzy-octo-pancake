import mongoose, { Schema, Document, model, models } from "mongoose";

export interface ICondition {
  dependentQuestionId: string;
  operator: "equals" | "not_equals" | "contains";
  value: string;
}

export interface IQuestion {
  id: string; // Unique ID for logic references
  questionText: string;
  type: "text" | "radio" | "checkbox";
  options: string[]; // Disimpan sebagai array string murni di MongoDB agar efisien
  required: boolean;
  conditionLogic?: "AND" | "OR";
  conditions?: ICondition[];
}

export interface ISurvey extends Document {
  title: string;
  uri: string;
  description: string;
  imageUrl?: string;
  targetSegment: "all" | "nismara_plus" | "intern";
  rewardType: "NONE" | "NC" | "PENALTY_TICKET";
  rewardAmount: number;
  questions: IQuestion[];
  active: boolean;
  createdBy: string; // discordId manager pembuat
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConditionSchema = new Schema<ICondition>({
  dependentQuestionId: { type: String, required: true },
  operator: { type: String, enum: ["equals", "not_equals", "contains"], required: true },
  value: { type: String, required: true },
}, { _id: false });

const QuestionSchema = new Schema<IQuestion>({
  id: { type: String, required: true },
  questionText: { type: String, required: true },
  type: { type: String, enum: ["text", "radio", "checkbox"], required: true },
  options: { type: [String], default: [] },
  required: { type: Boolean, default: true },
  conditionLogic: { type: String, enum: ["AND", "OR"], default: "AND" },
  conditions: { type: [ConditionSchema], default: [] },
});

const SurveySchema = new Schema<ISurvey>(
  {
    title: { type: String, required: true },
    uri: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: false },
    targetSegment: { type: String, enum: ["all", "nismara_plus", "intern"], default: "all" },
    rewardType: { type: String, enum: ["NONE", "NC", "PENALTY_TICKET"], default: "NC" },
    rewardAmount: { type: Number, default: 0 },
    questions: { type: [QuestionSchema], required: true },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

export const Survey = models.Survey || model<ISurvey>("Survey", SurveySchema);

