"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getUserWeeklyQuestProgress,
  claimWeeklyQuestReward,
  WeeklyQuestProgressResponse,
} from "@/lib/nplusWeeklyQuest";

/**
 * Mengambil data progress quest mingguan user yang sedang login
 */
export async function getWeeklyQuestsAction(bypassCache: boolean = false): Promise<WeeklyQuestProgressResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return {
        success: false,
        isNplusActive: false,
        weekInfo: {} as any,
        quests: [],
        totalCompleted: 0,
        totalClaimed: 0,
        error: "Silakan login terlebih dahulu.",
      };
    }

    const discordId = session.user.discordId || session.user.id;
    return await getUserWeeklyQuestProgress(String(discordId), bypassCache);
  } catch (error: any) {
    console.error("[WeeklyQuest Action] getWeeklyQuestsAction error:", error);
    return {
      success: false,
      isNplusActive: false,
      weekInfo: {} as any,
      quests: [],
      totalCompleted: 0,
      totalClaimed: 0,
      error: error?.message || "Gagal memuat data quest mingguan.",
    };
  }
}

/**
 * Melakukan klaim reward quest mingguan
 */
export async function claimWeeklyQuestAction(questId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  rewardTitle?: string;
  rewardDetails?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Silakan login terlebih dahulu." };
    }

    const discordId = session.user.discordId || session.user.id;
    const result = await claimWeeklyQuestReward(String(discordId), questId);

    if (result.success) {
      revalidatePath("/dashboard/nismaraplus");
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/currency");
      revalidatePath("/dashboard/garage");
    }

    return result;
  } catch (error: any) {
    console.error("[WeeklyQuest Action] claimWeeklyQuestAction error:", error);
    return { success: false, error: error?.message || "Terjadi kesalahan saat mengklaim hadiah." };
  }
}
