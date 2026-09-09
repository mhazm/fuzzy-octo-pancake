import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import UserVoucher from "@/lib/models/UserVoucher";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    // Auto-update expired vouchers for this user
    await UserVoucher.updateMany(
      {
        discordId: session.user.discordId,
        status: "ACTIVE",
        expiresAt: { $ne: null, $lt: new Date() },
      },
      { $set: { status: "EXPIRED" } }
    );

    const filter: any = {
      discordId: session.user.discordId,
    };

    if (category) {
      filter.category = category;
    }

    if (status) {
      filter.status = status;
    }

    const vouchers = await UserVoucher.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, vouchers });
  } catch (error: any) {
    console.error("Fetch My Vouchers Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengambil daftar voucher" },
      { status: 500 }
    );
  }
}
