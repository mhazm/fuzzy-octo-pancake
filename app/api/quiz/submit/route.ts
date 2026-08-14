import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import QuizQuestion from "@/lib/models/QuizQuestion";
import QuizAttempt from "@/lib/models/QuizAttempt";
import clientPromise from "@/lib/mongodb";

import dbConnect from "@/lib/mongoose";
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const body = await req.json();
    const { attemptId, answers } = body;

    if (!attemptId || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Data submit tidak valid" }, { status: 400 });
    }

    const attempt = await QuizAttempt.findById(attemptId);
    if (!attempt) {
      return NextResponse.json({ error: "Attempt tidak ditemukan" }, { status: 404 });
    }

    if (attempt.discordId !== session.user.discordId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (attempt.completedAt) {
      return NextResponse.json({ error: "Ujian ini sudah diselesaikan." }, { status: 400 });
    }

    // Cek batas waktu (15 menit + 2 menit toleransi = 17 menit)
    const now = new Date();
    const diffMins = (now.getTime() - attempt.startedAt.getTime()) / 60000;
    
    let isTimeout = false;
    if (diffMins > 17) {
      isTimeout = true;
    }

    // Ambil daftar pertanyaan dari DB untuk memvalidasi
    const questionIds = answers.map((a: any) => a.questionId);
    const dbQuestions = await QuizQuestion.find({ _id: { $in: questionIds } });
    const questionMap = new Map(dbQuestions.map(q => [q._id.toString(), q]));

    let correctCount = 0;
    const processedAnswers = answers.map((a: any) => {
      const q = questionMap.get(a.questionId.toString());
      const isCorrect = q && !isTimeout ? (q.correctOptionIndex === a.selectedOptionIndex) : false;
      if (isCorrect) correctCount++;

      return {
        questionId: a.questionId,
        selectedOptionIndex: a.selectedOptionIndex,
        isCorrect
      };
    });

    const totalQuestions = 20; // Tetap pembagi 20 (berdasarkan jumlah soal ujian standar)
    let score = Math.round((correctCount / totalQuestions) * 100);
    if (score > 100) score = 100;
    
    const passed = score >= 80;

    attempt.answers = processedAnswers;
    attempt.score = score;
    attempt.passed = passed;
    attempt.completedAt = now;
    await attempt.save();

    const client = await clientPromise;
    const db = client.db();
    const userDoc = await db.collection("users").findOne({ discordId: session.user.discordId });
    const targetChannelId = userDoc?.interviewChannelId;

    // Check if we should close their interview access
    if (passed) {
      await db.collection("users").updateOne(
        { discordId: session.user.discordId },
        { $unset: { isInterviewing: "", interviewChannelId: "" } }
      );
    } else if (attempt.attemptNumber >= 2) {
      await db.collection("users").updateOne(
        { discordId: session.user.discordId },
        { $unset: { isInterviewing: "" } }
      );
    }

    // -- POST Hasil Ujian ke Discord Channel Interview --
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const MANAGER_ROLE_ID = process.env.DISCORD_MANAGER_ROLE_ID;

    if (DISCORD_BOT_TOKEN && targetChannelId) {
      try {
        let msgContent = `**HASIL UJIAN KELAYAKAN PROMOSI**\nSopir: <@${session.user.discordId}>\nSkor: **${score}/100**\nStatus: **${passed ? 'LULUS ✅' : 'GAGAL ❌'}**\nPercobaan ke: ${attempt.attemptNumber}/2`;
        
        if (isTimeout) {
          msgContent += `\n*Catatan: Sistem mendeteksi overtime (melebihi 15 menit), sehingga beberapa skor dianulir.*`;
        }

        if (passed) {
          msgContent += `\n\n<@&${MANAGER_ROLE_ID}> Intern ini telah LULUS ujian! Silakan periksa kembali dan tekan tombol **Luluskan** di Dashboard untuk menaikkan jabatan mereka.`;
        } else if (attempt.attemptNumber >= 2) {
          msgContent += `\n\n<@&${MANAGER_ROLE_ID}> Intern ini telah gagal dalam ujian kelayakan sebanyak 2 kali. Mohon berikan bimbingan atau tindak lanjut.`;
        } else {
          msgContent += `\n\nSistem mengizinkan Anda untuk mencoba **1 kali lagi**. Silakan pelajari ulang sebelum mencoba kembali.`;
        }

        await fetch(`https://discord.com/api/v10/channels/${targetChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ content: msgContent })
        });
      } catch (err) {
        console.error("Gagal mengirim hasil ke Discord:", err);
      }
    }

    const reviewData = answers.map((a: any) => {
      const q = questionMap.get(a.questionId.toString());
      const isCorrect = q && !isTimeout ? (q.correctOptionIndex === a.selectedOptionIndex) : false;
      return {
        questionId: a.questionId,
        question: q?.question || "Soal tidak ditemukan",
        selectedOption: q?.options[a.selectedOptionIndex] || "Tidak dijawab",
        correctOption: q?.options[q?.correctOptionIndex] || "Tidak ada jawaban benar",
        isCorrect
      };
    });

    return NextResponse.json({ 
      success: true, 
      score, 
      passed, 
      isTimeout,
      review: reviewData,
      message: passed ? "Selamat! Anda lulus ujian kelayakan." : "Maaf, Anda belum lulus ujian kelayakan." 
    });
  } catch (error) {
    console.error("POST Quiz Submit Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
