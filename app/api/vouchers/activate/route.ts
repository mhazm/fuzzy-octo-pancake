import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import { activateBoosterVoucher } from "@/lib/voucher";
import "@/lib/models/User";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { voucherId } = await request.json();
    if (!voucherId) {
      return NextResponse.json(
        { error: "voucherId wajib disertakan" },
        { status: 400 }
      );
    }

    await dbConnect();

    const result = await activateBoosterVoucher(
      voucherId,
      session.user.discordId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `⚡ Booster berhasil diaktifkan! Bonus +${(result.multiplier || 0) * 100}% NC aktif hingga ${new Date(result.expiredAt!).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
      expiredAt: result.expiredAt,
      multiplier: result.multiplier,
    });
  } catch (error: any) {
    console.error("Activate Booster Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengaktifkan booster" },
      { status: 500 }
    );
  }
}
