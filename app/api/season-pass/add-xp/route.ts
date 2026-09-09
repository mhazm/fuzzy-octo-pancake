import { NextResponse } from "next/server";
import { addSeasonXp } from "@/lib/seasonPass";

export async function POST(request: Request) {
  try {
    const authHeader =
      request.headers.get("x-bot-secret") ||
      request.headers.get("authorization");
    const validSecret = process.env.NISMARA_SECRET_API;

    if (
      validSecret &&
      authHeader !== validSecret &&
      authHeader !== `Bearer ${validSecret}`
    ) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid Secret" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { discordId, xpAmount, reason = "Job Delivery XP" } = body;

    if (!discordId || !xpAmount) {
      return NextResponse.json(
        { error: "discordId dan xpAmount wajib diisi" },
        { status: 400 },
      );
    }

    const result = await addSeasonXp(discordId, Number(xpAmount), reason);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: result.capped
        ? result.message
        : `Berhasil menambahkan ${result.xpAdded?.toLocaleString("id-ID")} Seasonal XP ke driver ${discordId}.`,
    });
  } catch (error: any) {
    console.error("Add Season XP API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
