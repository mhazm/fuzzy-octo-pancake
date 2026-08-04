"use server";

import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

interface SubmitSurveyInput {
  surveyUri: string;
  answers: {
    questionText: string;
    answer: string | string[]; // Bisa string (text/radio) atau array (checkbox)
  }[];
}

export async function submitSurveyAction(data: SubmitSurveyInput) {
  try {
    // 1. Validasi Autentikasi Driver
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

    // 3. PENCEGAHAN GANDA: Cek apakah driver ini sudah pernah mengisi survey ini
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

    // 4. Simpan Jawaban Driver ke Koleksi 'survey_responses'
    await db.collection("survey_responses").insertOne({
      surveyUri: data.surveyUri,
      discordId: discordId,
      answers: data.answers,
      submittedAt: new Date(),
    });

    // 5. BERIKAN REWARD NISMARA COIN (NC) JIKA ADA
    const rewardAmount = survey.rewardNC || 0;
    if (rewardAmount > 0) {
      // Cari atau buat data mata uang (currencies) driver di database
      const currencyCol = db.collection("currencies");
      const userCurrency = await currencyCol.findOne({ discordId: discordId });

      if (userCurrency) {
        await currencyCol.updateOne(
          { discordId: discordId },
          { $inc: { amount: rewardAmount } },
        );
      } else {
        await currencyCol.insertOne({
          discordId: discordId,
          amount: rewardAmount,
        });
      }

      // Catat riwayat penambahan koin ke 'currencyhistories' (jika sistem poinmu menggunakannya)
      try {
        await db.collection("currencyhistories").insertOne({
          discordId: discordId,
          type: "add",
          amount: rewardAmount,
          reason: `Reward menyelesaikan survey: ${survey.title}`,
          createdAt: new Date(),
        });
      } catch (e) {
        // Abaikan jika struktur histori berbeda, yang penting saldo utama sudah masuk
      }
    }

    revalidatePath(`/surveys/${data.surveyUri}`);

    return {
      success: true,
      reward: rewardAmount,
      message:
        rewardAmount > 0
          ? `Berhasil! Jawaban tersimpan & kamu mendapatkan ${rewardAmount} Nismara Coin!`
          : "Berhasil! Jawaban survey kamu telah dikirim.",
    };
  } catch (error: any) {
    console.error("Error submitting survey:", error);
    return {
      success: false,
      error: "Terjadi kesalahan pada server saat mengirim jawaban.",
    };
  }
}
