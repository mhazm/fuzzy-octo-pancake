import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import {
  getActiveSeason,
  getUserSeasonProgress,
  getSeasonWeekInfo,
} from "@/lib/seasonPass";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const season = await getActiveSeason();
    if (!season) {
      return NextResponse.json({ error: "Tidak ada musim aktif" }, { status: 404 });
    }

    const progress = await getUserSeasonProgress(
      session.user.discordId,
      season.seasonNumber
    );

    const weekInfo = getSeasonWeekInfo(season, progress?.isPremium || false);

    return NextResponse.json({
      success: true,
      season,
      progress,
      weekInfo,
    });
  } catch (error: any) {
    console.error("Season Pass GET Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat data Season Pass" },
      { status: 500 }
    );
  }
}
