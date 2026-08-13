import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import QuizQuestion from "@/lib/models/QuizQuestion";

import dbConnect from "@/lib/mongoose";
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await req.json();
    const { question, options, correctOptionIndex, explanation, isActive } = body;

    if (!question || !options || options.length < 2 || typeof correctOptionIndex !== 'number') {
      return NextResponse.json({ error: "Data soal tidak lengkap atau tidak valid" }, { status: 400 });
    }

    if (correctOptionIndex < 0 || correctOptionIndex >= options.length) {
      return NextResponse.json({ error: "Indeks jawaban benar tidak valid" }, { status: 400 });
    }

    const { id } = await params;
    const updatedQuestion = await QuizQuestion.findByIdAndUpdate(
      id,
      {
        question,
        options,
        correctOptionIndex,
        explanation,
        isActive: isActive !== undefined ? isActive : true,
      },
      { new: true }
    );

    if (!updatedQuestion) {
      return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, question: updatedQuestion });
  } catch (error) {
    console.error("PUT QuizQuestion Error:", error);
    return NextResponse.json({ error: "Gagal memperbarui soal" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;
    const deletedQuestion = await QuizQuestion.findByIdAndDelete(id);

    if (!deletedQuestion) {
      return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE QuizQuestion Error:", error);
    return NextResponse.json({ error: "Gagal menghapus soal" }, { status: 500 });
  }
}
