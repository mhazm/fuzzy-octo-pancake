import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import DriverEvaluation from "@/lib/models/DriverEvaluation";
import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !session.user ||
      (session.user.role !== "manager" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get("driverId");
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const skip = (page - 1) * limit;

    const query: any = {};
    if (driverId) query.driverId = driverId;
    if (status) query.status = status;

    const [evaluations, total] = await Promise.all([
      DriverEvaluation.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DriverEvaluation.countDocuments(query),
    ]);

    return NextResponse.json(
      {
        success: true,
        evaluations,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("GET Evaluations Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil riwayat evaluasi" },
      { status: 500 }
    );
  }
}
