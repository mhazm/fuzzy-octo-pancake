"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import NplusQuestTemplate, { INplusQuestTemplate } from "@/lib/models/NplusQuestTemplate";
import NplusWeeklyActiveQuest from "@/lib/models/NplusWeeklyActiveQuest";
import {
  getWIBWeekInfo,
  ensureWeeklyQuestsInitialized,
  ensureStarterTemplates,
  pickDiverseWeeklyQuests,
} from "@/lib/nplusWeeklyQuest";

async function verifyManagerAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Sesi tidak valid. Silakan login kembali.");
  }

  const role = (session.user as any).role || (session.user as any).discordRole;
  if (role !== "manager" && role !== "admin") {
    throw new Error("Akses ditolak. Tindakan ini hanya untuk Manager / Admin.");
  }

  return session.user;
}

/**
 * Mengambil semua daftar template quest
 */
export async function getQuestTemplatesAction() {
  try {
    await verifyManagerAuth();
    await dbConnect();
    await ensureStarterTemplates();

    const templates = await NplusQuestTemplate.find().sort({ order: 1, createdAt: -1 }).lean();
    return {
      success: true,
      templates: JSON.parse(JSON.stringify(templates)),
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal mengambil daftar template." };
  }
}

/**
 * Membuat template quest baru
 */
export async function createQuestTemplateAction(data: Partial<INplusQuestTemplate>) {
  try {
    await verifyManagerAuth();
    await dbConnect();

    if (!data.title || !data.description || !data.type || !data.target || !data.reward) {
      return { success: false, error: "Semua kolom wajib diisi dengan lengkap." };
    }

    const newTemplate = await NplusQuestTemplate.create({
      title: data.title,
      description: data.description,
      type: data.type,
      target: Number(data.target),
      minCargoMass: Number(data.minCargoMass || 0),
      minDistanceKm: Number(data.minDistanceKm || 0),
      reward: data.reward,
      difficulty: data.difficulty || "MEDIUM",
      isActive: data.isActive !== undefined ? data.isActive : true,
      order: Number(data.order || 0),
    });

    revalidatePath("/dashboard/manage/nismaraplus/quests");
    revalidatePath("/dashboard/nismaraplus");

    return {
      success: true,
      message: "Template quest berhasil dibuat!",
      template: JSON.parse(JSON.stringify(newTemplate)),
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal membuat template quest." };
  }
}

/**
 * Mengupdate template quest
 */
export async function updateQuestTemplateAction(id: string, data: Partial<INplusQuestTemplate>) {
  try {
    await verifyManagerAuth();
    await dbConnect();

    const updated = await NplusQuestTemplate.findByIdAndUpdate(
      id,
      {
        $set: {
          title: data.title,
          description: data.description,
          type: data.type,
          target: Number(data.target),
          minCargoMass: Number(data.minCargoMass || 0),
          minDistanceKm: Number(data.minDistanceKm || 0),
          reward: data.reward,
          difficulty: data.difficulty || "MEDIUM",
          isActive: data.isActive,
          order: Number(data.order || 0),
        },
      },
      { new: true }
    );

    if (!updated) {
      return { success: false, error: "Template quest tidak ditemukan." };
    }

    revalidatePath("/dashboard/manage/nismaraplus/quests");
    revalidatePath("/dashboard/nismaraplus");

    return {
      success: true,
      message: "Template quest berhasil diperbarui!",
      template: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal memperbarui template quest." };
  }
}

/**
 * Menghapus template quest
 */
export async function deleteQuestTemplateAction(id: string) {
  try {
    await verifyManagerAuth();
    await dbConnect();

    const deleted = await NplusQuestTemplate.findByIdAndDelete(id);
    if (!deleted) {
      return { success: false, error: "Template quest tidak ditemukan." };
    }

    revalidatePath("/dashboard/manage/nismaraplus/quests");
    revalidatePath("/dashboard/nismaraplus");

    return { success: true, message: "Template quest berhasil dihapus!" };
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal menghapus template quest." };
  }
}

/**
 * Toggle status aktif/nonaktif template quest
 */
export async function toggleTemplateActiveAction(id: string, isActive: boolean) {
  try {
    await verifyManagerAuth();
    await dbConnect();

    const updated = await NplusQuestTemplate.findByIdAndUpdate(id, { $set: { isActive } }, { new: true });
    if (!updated) {
      return { success: false, error: "Template quest tidak ditemukan." };
    }

    revalidatePath("/dashboard/manage/nismaraplus/quests");
    return { success: true, message: `Status template berhasil diubah!` };
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal mengubah status template." };
  }
}

/**
 * Mengambil ringkasan quest aktif minggu ini dan estimasi rotasi minggu depan
 */
export async function getActiveAndNextWeekPreviewAction() {
  try {
    await verifyManagerAuth();
    await dbConnect();

    const currentWeekInfo = getWIBWeekInfo();
    const activeWeekly = await ensureWeeklyQuestsInitialized();

    // Hitung tanggal minggu depan
    const nextWeekDate = new Date(currentWeekInfo.startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekInfo = getWIBWeekInfo(nextWeekDate);

    // Ambil templates aktif
    const activeTemplates = await NplusQuestTemplate.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();

    // Simulasi pemilihan minggu depan dengan algoritma variasi tipe unik
    const nextWeekQuests = pickDiverseWeeklyQuests(activeTemplates, nextWeekInfo.weekNumber, 3);

    return {
      success: true,
      currentWeek: {
        weekInfo: currentWeekInfo,
        activeDoc: JSON.parse(JSON.stringify(activeWeekly)),
      },
      nextWeek: {
        weekInfo: nextWeekInfo,
        previewQuests: JSON.parse(JSON.stringify(nextWeekQuests)),
      },
      totalTemplates: await NplusQuestTemplate.countDocuments(),
      activeTemplatesCount: activeTemplates.length,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Gagal mengambil data preview mingguan." };
  }
}
