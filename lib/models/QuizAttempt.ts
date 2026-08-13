import mongoose, { Schema, Document, Model } from "mongoose";

export interface IQuizAttempt extends Document {
  discordId: string;
  score: number;
  passed: boolean;
  attemptNumber: number;
  answers: {
    questionId: mongoose.Types.ObjectId;
    selectedOptionIndex: number; // 0-based index of the original options array (not the shuffled one)
    isCorrect: boolean;
  }[];
  startedAt: Date;
  completedAt?: Date;
  discordChannelId?: string; // If we want to link it to the interview channel
}

const quizAttemptSchema = new Schema<IQuizAttempt>(
  {
    discordId: { type: String, required: true, index: true },
    score: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    attemptNumber: { type: Number, required: true, default: 1 },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: "QuizQuestion", required: true },
        selectedOptionIndex: { type: Number, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    discordChannelId: { type: String },
  },
  { timestamps: true }
);

const QuizAttempt: Model<IQuizAttempt> =
  mongoose.models.QuizAttempt || mongoose.model<IQuizAttempt>("QuizAttempt", quizAttemptSchema);

export default QuizAttempt;
