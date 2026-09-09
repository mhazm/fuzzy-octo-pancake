import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import Giveaway from "@/lib/models/Giveaway";
import GiveawayTicket from "@/lib/models/GiveawayTicket";
import { revalidatePath } from "next/cache";

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
 * GET: Ambil daftar seluruh Giveaway untuk Manager
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const giveaways = await Giveaway.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, giveaways }, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error("[Manage Giveaways GET]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

/**
 * POST: Buat Giveaway Baru oleh Manager
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const body = await req.json();
    const {
      title,
      slug,
      description,
      bannerUrl,
      startDate,
      endDate,
      drawDate,
      allowMultipleWins,
      enableQuests,
      quests,
      enableNcPurchase,
      ticketPriceNC,
      maxPurchasableTickets,
      discountNPlusAndBooster,
      prizes,
      status,
    } = body;

    if (!title || !startDate || !endDate || !prizes || prizes.length === 0) {
      return NextResponse.json(
        { error: "Mohon lengkapi judul, tanggal periode, dan minimal 1 tier hadiah." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Buat slug jika tidak diberikan
    const finalSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Cek duplikasi slug
    const existing = await Giveaway.findOne({ slug: finalSlug });
    if (existing) {
      return NextResponse.json(
        { error: "Slug atau judul giveaway sudah digunakan. Mohon gunakan judul lain." },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const newGiveaway = await Giveaway.create({
      title,
      slug: finalSlug,
      description: description || "",
      bannerUrl: bannerUrl || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      drawDate: drawDate ? new Date(drawDate) : new Date(endDate),
      status: status || "draft",
      allowMultipleWins: Boolean(allowMultipleWins),
      enableQuests: Boolean(enableQuests),
      quests: quests || [],
      enableNcPurchase: Boolean(enableNcPurchase),
      ticketPriceNC: Number(ticketPriceNC) || 1000,
      maxPurchasableTickets: Number(maxPurchasableTickets) ?? 5,
      discountNPlusAndBooster: Number(discountNPlusAndBooster) || 20,
      prizes: prizes || [],
      createdBy: session.user.discordId,
      stats: {
        totalTickets: 0,
        totalParticipants: 0,
        totalNcBurned: 0,
      },
    });

    revalidatePath("/dashboard/manage/giveaways");
    revalidatePath("/giveaways");

    return NextResponse.json(
      { success: true, message: "Giveaway berhasil dibuat.", giveaway: newGiveaway },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("[Manage Giveaways POST]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
