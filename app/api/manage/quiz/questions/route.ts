import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import QuizQuestion from "@/lib/models/QuizQuestion";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const questions = await QuizQuestion.find({}).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    console.error("GET QuizQuestions Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data soal" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const body = await req.json();
    const { question, options, correctOptionIndex, explanation } = body;

    if (!question || !options || options.length < 2 || typeof correctOptionIndex !== 'number') {
      return NextResponse.json({ error: "Data soal tidak lengkap atau tidak valid" }, { status: 400 });
    }

    if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
      return NextResponse.json({ error: "Indeks jawaban benar tidak valid" }, { status: 400 });
    }

    const newQuestion = await QuizQuestion.create({
      question,
      options,
      correctOptionIndex,
      explanation,
      isActive: true,
    });

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error) {
    console.error("POST QuizQuestions Error:", error);
    return NextResponse.json({ error: "Gagal membuat soal baru" }, { status: 500 });
  }
}
