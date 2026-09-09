import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getLeaderboardData,
  getAvailableLeaderboardMonths,
  LeaderboardCategory,
} from "@/lib/leaderboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get("category") || "distance") as LeaderboardCategory;
    const period = searchParams.get("period") || "";

    const session = await getServerSession(authOptions);
    const currentDiscordId = session?.user?.discordId ? String(session.user.discordId) : undefined;

    const [availableMonths, leaderboard] = await Promise.all([
      getAvailableLeaderboardMonths(),
      getLeaderboardData(category, period, currentDiscordId),
    ]);

    return NextResponse.json(
      {
        success: true,
        availableMonths,
        ...leaderboard,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
          "CDN-Cache-Control": "no-store",
          "Vercel-CDN-Cache-Control": "no-store",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error: any) {
    console.error("Leaderboard API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal memuat data papan peringkat",
      },
      { status: 500 }
    );
  }
}
