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
 * GET: Detail Giveaway & Tiket Peserta untuk Manager
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const { id } = await params;
    const giveaway = await Giveaway.findById(id).lean();
    if (!giveaway) {
      return NextResponse.json({ error: "Giveaway tidak ditemukan." }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    // Ambil daftar tiket terbaru
    const tickets = await GiveawayTicket.find({ giveawayId: id })
      .sort({ createdAt: -1 })
      .lean();

    // Enrich info user untuk setiap tiket
    const client = await clientPromise;
    const db = client.db();
    const discordIds = [...new Set(tickets.map((t: any) => String(t.discordId)))];
    const users = await db
      .collection("users")
      .find({ discordId: { $in: discordIds } })
      .project({ discordId: 1, name: 1, image: 1, truckyId: 1 })
      .toArray();

    const userMap = new Map<string, any>();
    users.forEach((u: any) => userMap.set(String(u.discordId), u));

    const enrichedTickets = tickets.map((t: any) => ({
      ...t,
      user: userMap.get(String(t.discordId)) || { name: `Driver #${t.discordId.slice(-4)}` },
    }));

    return NextResponse.json(
      { success: true, giveaway, tickets: enrichedTickets },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("[Manage Giveaway Detail GET]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

/**
 * PUT: Update Giveaway oleh Manager
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await Giveaway.findByIdAndUpdate(
      id,
      {
        $set: {
          title: body.title,
          description: body.description,
          bannerUrl: body.bannerUrl,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          drawDate: body.drawDate ? new Date(body.drawDate) : new Date(body.endDate),
          status: body.status,
          allowMultipleWins: Boolean(body.allowMultipleWins),
          enableQuests: Boolean(body.enableQuests),
          quests: body.quests || [],
          enableNcPurchase: Boolean(body.enableNcPurchase),
          ticketPriceNC: Number(body.ticketPriceNC) || 1000,
          maxPurchasableTickets: Number(body.maxPurchasableTickets) ?? 5,
          discountNPlusAndBooster: Number(body.discountNPlusAndBooster) || 20,
          prizes: body.prizes || [],
        },
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Giveaway tidak ditemukan." }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    revalidatePath("/dashboard/manage/giveaways");
    revalidatePath(`/dashboard/manage/giveaways/${id}`);
    revalidatePath("/giveaways");
    revalidatePath(`/giveaways/${updated.slug}`);

    return NextResponse.json(
      { success: true, message: "Giveaway berhasil diperbarui.", giveaway: updated },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("[Manage Giveaway Detail PUT]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}

/**
 * DELETE: Hapus Giveaway oleh Manager
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const { id } = await params;
    await Giveaway.findByIdAndDelete(id);
    await GiveawayTicket.deleteMany({ giveawayId: id });

    revalidatePath("/dashboard/manage/giveaways");
    revalidatePath("/giveaways");

    return NextResponse.json(
      { success: true, message: "Giveaway berhasil dihapus." },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("[Manage Giveaway Detail DELETE]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
