import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { executeGiveawayDraw } from "@/lib/giveaway";
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
 * POST: Eksekusi Pengundian Pemenang Manual oleh Manager
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: NO_CACHE_HEADERS });
    }

    const { id } = await params;
    const result = await executeGiveawayDraw(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    revalidatePath("/dashboard/manage/giveaways");
    revalidatePath(`/dashboard/manage/giveaways/${id}`);
    revalidatePath("/giveaways");

    return NextResponse.json(
      {
        success: true,
        message: `Pengundian berhasil! Selamat kepada para pemenang "${result.giveawayTitle}".`,
        winners: result.winners,
      },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("[Manage Giveaway Draw POST]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
