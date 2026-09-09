import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import Giveaway from "@/lib/models/Giveaway";
import { executeGiveawayDraw } from "@/lib/giveaway";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * Endpoint Eksekusi Cron Giveaway untuk Bot Natasya / Webhook
 * POST /api/cron/giveaways
 */
export async function POST(req: NextRequest) {
  // 1. Validasi Keamanan Token Internal / Cron Secret
  const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ") ||
    authHeader.split(" ")[1] !== expectedSecret
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Invalid or missing authorization token.",
      },
      { status: 401, headers: NO_CACHE_HEADERS },
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const giveawayId = body.giveawayId;

    // A. Jika request memuat giveawayId spesifik (Event-Driven dari Natasya saat giveaway tertentu selesai)
    if (giveawayId) {
      const drawResult = await executeGiveawayDraw(giveawayId);
      if (!drawResult.success) {
        return NextResponse.json(
          { success: false, error: drawResult.error },
          { status: 400, headers: NO_CACHE_HEADERS },
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: `Giveaway "${drawResult.giveawayTitle}" berhasil diundi.`,
          giveawayTitle: drawResult.giveawayTitle,
          winners: drawResult.winners,
        },
        { status: 200, headers: NO_CACHE_HEADERS },
      );
    }

    // B. Mode Otomatis / Scan (Jika Natasya atau Scheduler memanggil tanpa giveawayId)
    const client = await clientPromise;
    const db = client.db();
    const now = new Date();

    // 1. Auto-Start: Ubah scheduled ke ongoing jika startDate sudah tiba
    const scheduledToStart = await db
      .collection("giveaways")
      .find({ status: "scheduled", startDate: { $lte: now } })
      .toArray();

    const startedTitles: string[] = [];
    for (const g of scheduledToStart) {
      await db
        .collection("giveaways")
        .updateOne(
          { _id: g._id },
          { $set: { status: "ongoing", updatedAt: now } },
        );
      startedTitles.push(g.title);
    }

    // 2. Auto-Draw: Ambil giveaway yang sedang ongoing dan endDate sudah lewat
    const dueGiveaways = await db
      .collection("giveaways")
      .find({ status: "ongoing", endDate: { $lte: now } })
      .toArray();

    const completedResults: any[] = [];
    for (const g of dueGiveaways) {
      const res = await executeGiveawayDraw(String(g._id));
      if (res.success) {
        completedResults.push({
          giveawayId: g._id,
          giveawayTitle: res.giveawayTitle,
          winners: res.winners,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        startedCount: startedTitles.length,
        startedGiveaways: startedTitles,
        completedCount: completedResults.length,
        completedGiveaways: completedResults,
      },
      { status: 200, headers: NO_CACHE_HEADERS },
    );
  } catch (error: any) {
    console.error("[API Cron Giveaways] Error executing giveaway cron:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500, headers: NO_CACHE_HEADERS },
    );
  }
}
