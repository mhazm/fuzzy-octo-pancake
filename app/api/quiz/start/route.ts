import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import QuizQuestion from "@/lib/models/QuizQuestion";
import QuizAttempt from "@/lib/models/QuizAttempt";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const discordId = String(session.user.discordId);

    // Cek jumlah percobaan
    const pastAttemptsCount = await QuizAttempt.countDocuments({ discordId, completedAt: { $exists: true } });
    if (pastAttemptsCount >= 2) {
      return NextResponse.json({ error: "Anda telah mencapai batas maksimal percobaan ujian (2 kali)." }, { status: 403 });
    }

    // Cek apakah ada ujian yang sedang berlangsung (belum disubmit)
    let activeAttempt = await QuizAttempt.findOne({ discordId, completedAt: { $exists: false } });

    // Ambil 20 soal acak
    const questions = await QuizQuestion.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: 20 } }
    ]);

    if (questions.length === 0) {
      return NextResponse.json({ error: "Belum ada soal ujian yang tersedia." }, { status: 404 });
    }

    if (!activeAttempt) {
      activeAttempt = await QuizAttempt.create({
        discordId,
        attemptNumber: pastAttemptsCount + 1,
        startedAt: new Date()
      });
    } else {
      // Jika sudah lebih dari 20 menit sejak dimulai, anggap hangus dan buat baru
      const now = new Date();
      const diffMins = (now.getTime() - activeAttempt.startedAt.getTime()) / 60000;
      if (diffMins > 20) {
        await QuizAttempt.findByIdAndDelete(activeAttempt._id);
        activeAttempt = await QuizAttempt.create({
          discordId,
          attemptNumber: pastAttemptsCount + 1,
          startedAt: new Date()
        });
      }
    }

    // Format soal ke client (sembunyikan jawaban benar, acak opsi)
    const clientQuestions = questions.map(q => {
      // Buat array opsi dengan index aslinya
      const optionsWithIndex = q.options.map((text: string, originalIndex: number) => ({ text, originalIndex }));
      
      // Shuffle options (Fisher-Yates)
      for (let i = optionsWithIndex.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithIndex[i], optionsWithIndex[j]] = [optionsWithIndex[j], optionsWithIndex[i]];
      }

      return {
        _id: q._id,
        question: q.question,
        options: optionsWithIndex
      };
    });

    return NextResponse.json({ 
      success: true, 
      attemptId: activeAttempt._id, 
      startedAt: activeAttempt.startedAt,
      questions: clientQuestions,
      attemptNumber: activeAttempt.attemptNumber
    });
  } catch (error) {
    console.error("GET Quiz Start Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
