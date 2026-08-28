"use server";

import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
import { verifyTurnstileToken } from "@/lib/turnstile";

interface SubmitSurveyInput {
  surveyUri: string;
  turnstileToken: string | null;
  answers: {
    questionText: string;
    answer: string | string[];
  }[];
}


export async function submitSurveyAction(data: SubmitSurveyInput) {
  try {
    // 1. Verifikasi Turnstile (bot protection)
    const turnstileResult = await verifyTurnstileToken(data.turnstileToken);
    if (!turnstileResult.success) {
      return {
        success: false,
        error: "Verifikasi keamanan gagal. Selesaikan tantangan Turnstile dan coba lagi.",
      };
    }

    // 2. Validasi Autentikasi Driver
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return {
        success: false,
        error: "Kamu harus login terlebih dahulu sebagai driver.",
      };
    }

    const discordId = session.user.id || (session.user as any).discordId;

    const client = await clientPromise;
    const db = client.db();


    // 2. Cek apakah survey ini ada dan masih aktif
    const survey = await db
      .collection("surveys")
      .findOne({ uri: data.surveyUri });
    if (!survey) {
      return { success: false, error: "Survey tidak ditemukan." };
    }

    const now = new Date();
    const expiresAt = survey.expiresAt
      ? new Date(survey.expiresAt)
      : new Date();
    if (!survey.active || expiresAt < now) {
      return {
        success: false,
        error: "Maaf, survey ini sudah ditutup atau melewati batas waktu.",
      };
    }

    // 3. Validasi Target Segment
    const userInDb = await db.collection("users").findOne({ _id: new ObjectId(session.user._id) });
    if (!userInDb) {
      return { success: false, error: "Data pengguna tidak ditemukan." };
    }

    if (survey.targetSegment === "nismara_plus") {
      const isPlus = userInDb.nismaraplus?.status === true;
      if (!isPlus) {
        return { success: false, error: "Survey ini khusus untuk pengguna Nismara+ aktif." };
      }
    } else if (survey.targetSegment === "intern") {
      const isIntern = userInDb.truckyRole === "Magang";
      if (!isIntern) {
        return { success: false, error: "Survey ini khusus untuk Driver Intern (Magang)." };
      }
    }

    // 4. PENCEGAHAN GANDA: Cek apakah driver ini sudah pernah mengisi survey ini
    const existingResponse = await db.collection("survey_responses").findOne({
      surveyUri: data.surveyUri,
      discordId: discordId,
    });

    if (existingResponse) {
      return {
        success: false,
        error:
          "Kamu sudah pernah mengisi survey ini! Pengisian hanya diperbolehkan 1 kali.",
      };
    }

    // 5. Simpan Jawaban Driver ke Koleksi 'survey_responses'
    await db.collection("survey_responses").insertOne({
      surveyUri: data.surveyUri,
      discordId: discordId,
      answers: data.answers,
      submittedAt: new Date(),
    });

    // 6. BERIKAN REWARD JIKA ADA
    const rewardType = survey.rewardType || "NC"; // Fallback untuk survey lama
    const rewardAmount = survey.rewardAmount !== undefined ? survey.rewardAmount : (survey.rewardNC || 0);
    const guildId = "863959415702028318";
    
    let rewardMessage = "Berhasil! Jawaban survey kamu telah dikirim.";

    if (rewardAmount > 0 && rewardType !== "NONE") {
      if (rewardType === "NC") {
        await db.collection("currencies").updateOne(
          { userId: discordId, guildId: guildId },
          { $inc: { totalNC: rewardAmount } },
          { upsert: true }
        );

        await db.collection("currencyhistories").insertOne({
          guildId: guildId,
          userId: discordId,
          amount: rewardAmount,
          type: "earn",
          reason: `Reward menyelesaikan survey: ${survey.title}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
        });

        rewardMessage = `Berhasil! Jawaban tersimpan & kamu mendapatkan ${rewardAmount} Nismara Coin!`;
      } else if (rewardType === "PENALTY_TICKET") {
        await db.collection("garages").updateOne(
          { discordId: discordId },
          { $inc: { safeboxStock: rewardAmount } },
          { upsert: true }
        );
        
        rewardMessage = `Berhasil! Jawaban tersimpan & kamu mendapatkan ${rewardAmount} Tiket Hapus Penalti!`;
      }
    }

    revalidatePath(`/surveys/${data.surveyUri}`);

    return {
      success: true,
      reward: rewardAmount,
      message: rewardMessage,
    };
  } catch (error: any) {
    console.error("Error submitting survey:", error);
    return {
      success: false,
      error: "Terjadi kesalahan pada server saat mengirim jawaban.",
    };
  }
}
