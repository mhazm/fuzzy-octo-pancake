import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuizQuestion extends Document {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const quizQuestionSchema = new Schema<IQuizQuestion>(
  {
    question: { type: String, required: true },
    options: { type: [String], required: true, validate: [arrayLimit, 'Soal harus memiliki setidaknya 2 opsi'] },
    correctOptionIndex: { type: Number, required: true, min: 0 },
    explanation: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

function arrayLimit(val: string[]) {
  return val.length >= 2;
}

const QuizQuestion: Model<IQuizQuestion> =
  mongoose.models.QuizQuestion || mongoose.model<IQuizQuestion>("QuizQuestion", quizQuestionSchema);

export default QuizQuestion;
