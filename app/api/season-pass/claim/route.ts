import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import {
  claimLevelReward,
  claimAllAvailableRewards,
  getActiveSeason,
  getUserSeasonProgress,
  getSeasonPassFeatureStatus,
} from "@/lib/seasonPass";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const featureStatus = await getSeasonPassFeatureStatus();
    if (!featureStatus.isEnabled) {
      return NextResponse.json(
        { error: featureStatus.disabledReason || "Fitur Season Pass sedang dinonaktifkan sementara." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { level, track, claimAll, seasonNumber = 1 } = body;

    let result;

    if (claimAll) {
      result = await claimAllAvailableRewards(
        session.user.discordId,
        seasonNumber
      );
    } else {
      if (!level || !track) {
        return NextResponse.json(
          { error: "Parameter level dan track (free/premium) wajib diisi" },
          { status: 400 }
        );
      }
      result = await claimLevelReward(
        session.user.discordId,
        seasonNumber,
        level,
        track
      );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const updatedProgress = await getUserSeasonProgress(
      session.user.discordId,
      seasonNumber
    );

    // Revalidasi cache
    try {
      revalidatePath("/dashboard/season-pass");
      revalidatePath("/dashboard/currency");
      revalidatePath("/dashboard/garage");
      revalidatePath("/dashboard");
    } catch (e) {
      console.error("Failed to revalidate season pass paths:", e);
    }

    return NextResponse.json({
      success: true,
      result,
      progress: updatedProgress,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });
  } catch (error: any) {
    console.error("Season Pass Claim Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengklaim hadiah" },
      { status: 500 }
    );
  }
}
