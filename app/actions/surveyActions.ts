"use server";

import clientPromise from "@/lib/mongodb"; // Sesuaikan dengan path singleton mongodb.ts milikmu
import { Survey } from "@/lib/models/Survey";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Sesuaikan dengan konfigurasi NextAuth kamu
import { revalidatePath } from "next/cache";

// Definisikan tipe parameter masukan dari client form
interface CreateSurveyInput {
  title: string;
  uri: string;
  description: string;
  rewardNC: number;
  expiresInDays: number;
  questions: {
    questionText: string;
    type: "text" | "radio" | "checkbox";
    options: { value: string }[];
    required: boolean;
  }[];
}

export async function createSurveyAction(data: CreateSurveyInput) {
  try {
    // 1. Validasi Autentikasi Driver via NextAuth
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Kamu harus login terlebih dahulu." };
    }

    const discordId = session.user.id || (session.user as any).discordId;

    // 2. Proteksi Akses Khusus Manager
    // Mengingat kamu sudah menyimpan data status role di MongoDB / callback NextAuth sebelumnya:
    const isManager =
      (session.user as any).role === "manager" ||
      (session.user as any).isManager;

    if (!isManager) {
      return {
        success: false,
        error: "Akses ditolak! Hanya manajer yang dapat menerbitkan survey.",
      };
    }

    // 3. Transformasi Struktur Data Options
    // Di form React Hook Form, opsi berwujud array objek: [{ value: "ETS2" }, { value: "ATS" }]
    // Kita bersihkan agar menjadi array string murni di MongoDB: ["ETS2", "ATS"]
    const formattedQuestions = data.questions.map((q) => {
      const isChoiceType = q.type === "radio" || q.type === "checkbox";
      return {
        questionText: q.questionText,
        type: q.type,
        options: isChoiceType
          ? q.options.map((o) => o.value.trim()).filter(Boolean)
          : [],
        required: q.required,
      };
    });

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + data.expiresInDays);

    const client = await clientPromise;
    const db = client.db();

    const newSurveys = db.collection("surveys").insertOne({
      title: data.title.trim(),
      uri: data.uri.trim(),
      description: data.description.trim(),
      rewardNC: data.rewardNC,
      expiresAt: expirationDate,
      questions: formattedQuestions,
      createdBy: discordId,
      active: true,
    });

    // Clear cache dashboard agar survey terbaru langsung muncul di list halaman utama manajemen
    revalidatePath("/dashboard/manage/surveys");

    return { success: true };
  } catch (error: any) {
    console.error("Error saving survey to MongoDB:", error);
    return {
      success: false,
      error: "Gagal menyimpan survey ke database server.",
    };
  }
}

// Tambahkan interface baru untuk update (jika diperlukan) atau gunakan struktur yang mirip
interface UpdateSurveyInput {
  id: string; // Kita butuh ID asli MongoDB untuk memperbarui data
  title: string;
  uri: string;
  description: string;
  rewardNC: number;
  active: boolean; // Tambahan agar manager bisa open/close survey secara manual
  questions: {
    questionText: string;
    type: "text" | "radio" | "checkbox";
    options: { value: string }[];
    required: boolean;
  }[];
}

export async function updateSurveyAction(data: UpdateSurveyInput) {
  try {
    // 1. Validasi Autentikasi & Role Manager
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return { success: false, error: "Kamu harus login terlebih dahulu." };
    }
    const isManager =
      (session.user as any).role === "manager" ||
      (session.user as any).isManager;
    if (!isManager) {
      return {
        success: false,
        error: "Akses ditolak! Hanya manajer yang dapat mengubah data.",
      };
    }

    // 2. Format ulang struktur opsi pertanyaan untuk MongoDB (array of object -> array of string)
    const formattedQuestions = data.questions.map((q) => {
      const isChoiceType = q.type === "radio" || q.type === "checkbox";
      return {
        questionText: q.questionText,
        type: q.type,
        options: isChoiceType
          ? q.options.map((o) => o.value.trim()).filter(Boolean)
          : [],
        required: q.required,
      };
    });

    const client = await clientPromise;
    const db = client.db();
    const { ObjectId } = require("mongodb");

    // 3. Eksekusi Update ke MongoDB
    const result = await db.collection("surveys").updateOne(
      { _id: new ObjectId(data.id) },
      {
        $set: {
          title: data.title.trim(),
          uri: data.uri.trim(),
          description: data.description.trim(),
          rewardNC: data.rewardNC,
          active: data.active,
          questions: formattedQuestions,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return { success: false, error: "Survey tidak ditemukan di database." };
    }

    // Refresh data dashboard list utama secara instan
    revalidatePath("/dashboard/manage/surveys");
    revalidatePath(`/dashboard/manage/surveys/${data.uri}/results`);

    return { success: true };
  } catch (error: any) {
    console.error("Error updating survey in MongoDB:", error);
    if (error.code === 11000) {
      return {
        success: false,
        error: "URL Slug (URI) tersebut sudah digunakan oleh survey lain.",
      };
    }
    return {
      success: false,
      error: "Gagal memperbarui data survey pada server.",
    };
  }
}
