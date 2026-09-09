import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { claimGiveawayQuestTicket } from "@/lib/giveaway";
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
 * POST: Klaim tiket undian dari penyelesaian quest game
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const questId = body.questId;

    if (!questId) {
      return NextResponse.json({ error: "ID Quest wajib disertakan." }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const result = await claimGiveawayQuestTicket(id, questId, String(session.user.discordId));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    revalidatePath(`/giveaways`);
    revalidatePath(`/giveaways/[slug]`, "page");

    return NextResponse.json(
      {
        success: true,
        message: `Selamat! Anda berhasil mengklaim Tiket Undian #${result.ticketNumber}.`,
        ticketNumber: result.ticketNumber,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("[Giveaway Claim Quest POST]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
