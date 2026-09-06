"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import UserSeasonProgress from "@/lib/models/UserSeasonProgress";
import { getLatestSeason, getSeasonPassFeatureStatus } from "@/lib/seasonPass";

export interface SeasonPassSummary {
  seasonNumber: number;
  title: string;
  isPremium: boolean;
  currentLevel: number;
  currentXp: number;
  status: string;
}

export async function getSeasonPassSummary(): Promise<SeasonPassSummary | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) return null;

    const featureStatus = await getSeasonPassFeatureStatus();
    if (!featureStatus.isEnabled) return null;

    await dbConnect();

    const season = await getLatestSeason();
    if (!season) return null;

    const progress = await UserSeasonProgress.findOne({
      discordId: String(session.user.discordId),
      seasonNumber: season.seasonNumber,
    }).lean();

    return {
      seasonNumber: season.seasonNumber,
      title: season.title || `Season ${season.seasonNumber}`,
      isPremium: Boolean(progress?.isPremium),
      currentLevel: progress?.currentLevel ?? 0,
      currentXp: progress?.currentXp ?? 0,
      status: season.status || "ACTIVE",
    };
  } catch (error) {
    console.error("Gagal mengambil ringkasan Season Pass:", error);
    return null;
  }
}
