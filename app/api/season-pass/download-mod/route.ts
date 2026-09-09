import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import SeasonPass from "@/lib/models/SeasonPass";
import { getUserSeasonProgress, calculateLevelFromXp } from "@/lib/seasonPass";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json(
        { error: "Silakan login terlebih dahulu untuk mengakses unduhan." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const seasonNumber = Number(searchParams.get("seasonNumber") || 1);

    await dbConnect();

    const season = await SeasonPass.findOne({ seasonNumber });
    if (!season) {
      return NextResponse.json(
        { error: "Musim tidak ditemukan" },
        { status: 404 }
      );
    }

    const progress = await getUserSeasonProgress(session.user.discordId, seasonNumber);
    if (!progress) {
      return NextResponse.json(
        { error: "Progress Season Pass Anda tidak ditemukan." },
        { status: 404 }
      );
    }

    // 1. ATOMIC GUARD: Wajib Pemilik Nismara Pass Premium
    if (!progress.isPremium) {
      return NextResponse.json(
        {
          error:
            "Akses Ditolak: Hadiah Puncak Grand Prize Mod eksklusif hanya untuk pemilik Nismara Pass Premium!",
        },
        { status: 403 }
      );
    }

    // 2. ATOMIC GUARD: Wajib Menyelesaikan Level 30
    const currentLvl = calculateLevelFromXp(progress.currentXp, season.levels);
    if (currentLvl < 30) {
      return NextResponse.json(
        {
          error: `Akses Ditolak: Anda belum menyelesaikan Level 30 untuk mengunduh Mod ini! (Level Anda saat ini: Level ${currentLvl})`,
        },
        { status: 403 }
      );
    }

    const downloadUrl = season.grandPrize?.downloadUrl;
    if (!downloadUrl || !downloadUrl.trim()) {
      return NextResponse.json(
        { error: "Tautan unduhan file mod resmi belum disiapkan oleh Manager." },
        { status: 404 }
      );
    }

    // Redirect aman ke tautan unduh mod
    return NextResponse.redirect(new URL(downloadUrl, request.url));
  } catch (error: any) {
    console.error("Download Mod Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses unduhan mod" },
      { status: 500 }
    );
  }
}
