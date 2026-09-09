import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getUserGiveawayProgress } from "@/lib/giveaway";

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
 * GET: Ambil progres tiket & quest giveaway milik user login
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401, headers: NO_CACHE_HEADERS });
    }

    const { id } = await params;
    const progress = await getUserGiveawayProgress(id, String(session.user.discordId));

    return NextResponse.json(progress, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error("[Giveaway Progress GET]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
