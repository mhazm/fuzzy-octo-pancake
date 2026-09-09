import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import SeasonPass from "@/lib/models/SeasonPass";
import SeasonPassTemplate from "@/lib/models/SeasonPassTemplate";
import UserSeasonProgress from "@/lib/models/UserSeasonProgress";
import User from "@/lib/models/User";
import {
  SEASON_1_LEVELS,
  ensureSeasonInitialized,
  getSeasonPassFeatureStatus,
  setSeasonPassFeatureStatus,
} from "@/lib/seasonPass";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isManager =
      session?.user?.role === "manager" || session?.user?.role === "admin";

    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized: Akses Manager Diperlukan" }, { status: 403 });
    }

    await dbConnect();
    await ensureSeasonInitialized();

    const { searchParams } = new URL(request.url);
    const selectedSeasonNum = searchParams.get("seasonNumber")
      ? Number(searchParams.get("seasonNumber"))
      : null;

    const seasons = await SeasonPass.find().sort({ seasonNumber: -1 }).lean();

    const activeSeason =
      (selectedSeasonNum
        ? seasons.find((s) => s.seasonNumber === selectedSeasonNum)
        : seasons.find((s) => s.status === "ACTIVE")) || seasons[0];

    // Analytics for the selected season
    const targetSeasonNumber = activeSeason?.seasonNumber || 1;
    const progressList = await UserSeasonProgress.find({ seasonNumber: targetSeasonNumber }).lean();

    const userIds = progressList.map((p) => p.discordId);
    const users = await User.find({ discordId: { $in: userIds } })
      .select("name image discordId truckyId")
      .lean();

    const userMap = new Map(users.map((u) => [String(u.discordId), u]));

    const enrichedProgress = progressList.map((p) => ({
      ...p,
      user: userMap.get(String(p.discordId)) || { name: "Driver Nismara", discordId: p.discordId },
    }));

    // Calculate Summary Stats
    const totalDrivers = progressList.length;
    const totalPremium = progressList.filter((p) => p.isPremium).length;
    const completedCount = progressList.filter((p) => p.currentLevel >= 30).length;
    const totalXpEarned = progressList.reduce((acc, p) => acc + (p.currentXp || 0), 0);

    const featureStatus = await getSeasonPassFeatureStatus();

    return NextResponse.json(
      {
        success: true,
        featureStatus,
        seasons: JSON.parse(JSON.stringify(seasons)),
        activeSeason: JSON.parse(JSON.stringify(activeSeason)),
        stats: {
          totalDrivers,
          totalPremium,
          completedCount,
          totalXpEarned,
        },
        driverProgress: JSON.parse(JSON.stringify(enrichedProgress)),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error: any) {
    console.error("Manage Season Pass GET Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat data Manager Season Pass" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const isManager =
      session?.user?.role === "manager" || session?.user?.role === "admin";

    if (!isManager) {
      return NextResponse.json({ error: "Unauthorized: Akses Manager Diperlukan" }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const { action } = body;

    if (action === "CREATE") {
      const {
        seasonNumber,
        title,
        subtitle,
        theme = "default",
        startAt,
        endAt,
        totalXp = 250000,
        weeklyCapXp = 20000,
        finalRushWeeks = 2,
        grandPrizeTitle,
        grandPrizeDesc,
        grandPrizeUrl,
        grandPrizeImageUrl,
        grandPrizeType = "MOD_LIVERY",
        premiumPriceIdr = 35000,
        premiumPriceNc = 75000,
        levelPriceIdr = 2000,
        templateId,
        copyRewardsFromSeason,
      } = body;

      const existing = await SeasonPass.findOne({ seasonNumber: Number(seasonNumber) });
      if (existing) {
        return NextResponse.json(
          { error: `Season ${seasonNumber} sudah ada di database!` },
          { status: 400 }
        );
      }

      // Ambil template level dari template terpilih, season sebelumnya, atau default
      let levelsTemplate = SEASON_1_LEVELS;
      if (templateId) {
        const chosenTemplate = await SeasonPassTemplate.findById(templateId);
        if (chosenTemplate?.levels?.length) {
          levelsTemplate = chosenTemplate.levels;
        }
      } else if (copyRewardsFromSeason) {
        const sourceSeason = await SeasonPass.findOne({ seasonNumber: Number(copyRewardsFromSeason) });
        if (sourceSeason?.levels?.length) {
          levelsTemplate = sourceSeason.levels;
        }
      } else {
        const defaultTpl = await SeasonPassTemplate.findOne({ isDefault: true });
        if (defaultTpl?.levels?.length) {
          levelsTemplate = defaultTpl.levels;
        }
      }

      const newSeason = await SeasonPass.create({
        seasonNumber: Number(seasonNumber),
        title,
        subtitle: subtitle || "",
        theme,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        status: "DRAFT",
        totalXp: Number(totalXp),
        weeklyCapXp: Number(weeklyCapXp),
        finalRushWeeks: Number(finalRushWeeks),
        levels: levelsTemplate,
        grandPrize: {
          title: grandPrizeTitle || `Hadiah Puncak Season ${seasonNumber}`,
          description: grandPrizeDesc || `Hadiah eksklusif edisi terbatas untuk Season ${seasonNumber}`,
          type: grandPrizeType || "MOD_LIVERY",
          downloadUrl: grandPrizeUrl || "",
          imageUrl: grandPrizeImageUrl || (grandPrizeType === "PHYSICAL_MERCH" || grandPrizeType === "PHYSICAL" ? "/images/season-pass/grandprize-merch-default.jpg" : "/images/season-pass/grandprize-mod-default.jpg"),
        },
        premiumPriceIdr: Number(premiumPriceIdr),
        premiumPriceNc: Number(premiumPriceNc),
        levelPriceIdr: Number(levelPriceIdr),
      });

      return NextResponse.json({
        success: true,
        message: `Season ${seasonNumber} (${title}) berhasil dibuat!`,
        season: newSeason,
      });
    }

    if (action === "UPDATE" || action === "EDIT") {
      const {
        seasonNumber,
        title,
        subtitle,
        theme,
        startAt,
        endAt,
        totalXp,
        weeklyCapXp,
        finalRushWeeks,
        grandPrizeTitle,
        grandPrizeDesc,
        grandPrizeUrl,
        grandPrizeImageUrl,
        grandPrizeType,
        premiumPriceIdr,
        premiumPriceNc,
        levelPriceIdr,
        status,
      } = body;

      const season = await SeasonPass.findOne({ seasonNumber: Number(seasonNumber) });
      if (!season) {
        return NextResponse.json({ error: "Season tidak ditemukan" }, { status: 404 });
      }

      if (title) season.title = title;
      if (subtitle !== undefined) season.subtitle = subtitle;
      if (theme) season.theme = theme;
      if (startAt) season.startAt = new Date(startAt);
      if (endAt) season.endAt = new Date(endAt);
      if (totalXp) season.totalXp = Number(totalXp);
      if (weeklyCapXp) season.weeklyCapXp = Number(weeklyCapXp);
      if (finalRushWeeks !== undefined) season.finalRushWeeks = Number(finalRushWeeks);
      if (premiumPriceIdr !== undefined) season.premiumPriceIdr = Number(premiumPriceIdr);
      if (premiumPriceNc !== undefined) season.premiumPriceNc = Number(premiumPriceNc);
      if (levelPriceIdr !== undefined) season.levelPriceIdr = Number(levelPriceIdr);
      if (status) season.status = status;

      if (grandPrizeTitle || grandPrizeDesc || grandPrizeUrl !== undefined || grandPrizeImageUrl !== undefined || grandPrizeType) {
        season.grandPrize = {
          ...season.grandPrize,
          title: grandPrizeTitle || season.grandPrize?.title,
          description: grandPrizeDesc || season.grandPrize?.description,
          type: grandPrizeType || season.grandPrize?.type || "MOD_LIVERY",
          downloadUrl: grandPrizeUrl !== undefined ? grandPrizeUrl : season.grandPrize?.downloadUrl,
          imageUrl: grandPrizeImageUrl !== undefined ? grandPrizeImageUrl : season.grandPrize?.imageUrl,
        };
      }

      await season.save();

      return NextResponse.json({
        success: true,
        message: `Season ${seasonNumber} berhasil diperbarui!`,
        season,
      });
    }

    if (action === "ACTIVATE") {
      const { seasonNumber } = body;
      // Set all other seasons to COMPLETED or DRAFT
      await SeasonPass.updateMany(
        { seasonNumber: { $ne: Number(seasonNumber) }, status: "ACTIVE" },
        { $set: { status: "COMPLETED" } }
      );

      const activated = await SeasonPass.findOneAndUpdate(
        { seasonNumber: Number(seasonNumber) },
        { $set: { status: "ACTIVE" } },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: `Season ${seasonNumber} sekarang aktif sebagai musim utama!`,
        season: activated,
      });
    }

    if (action === "TOGGLE_FEATURE") {
      const { enabled, disabledReason } = body;
      const status = await setSeasonPassFeatureStatus(
        Boolean(enabled),
        typeof disabledReason === "string" ? disabledReason.trim() : "",
        String(session.user.discordId || "manager")
      );

      return NextResponse.json(
        {
          success: true,
          message: `Fitur Season Pass berhasil di-${enabled ? "aktifkan" : "nonaktifkan"}!`,
          featureStatus: status,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            Pragma: "no-cache",
          },
        }
      );
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (error: any) {
    console.error("Manage Season Pass POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memproses aksi Season Pass" },
      { status: 500 }
    );
  }
}
