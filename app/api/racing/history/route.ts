import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import RacingTicket from "@/lib/models/RacingTicket";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;

    await clientPromise;

    const recentTickets = await RacingTicket.find({ discordId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const statsAgg = await RacingTicket.aggregate([
      { $match: { discordId } },
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          totalSpent: { $sum: "$betAmount" },
          totalWon: { $sum: "$prizeWon" },
        },
      },
    ]);

    const stats = statsAgg[0] || {
      totalTickets: 0,
      totalSpent: 0,
      totalWon: 0,
    };

    return NextResponse.json({
      recentTickets,
      stats,
    });
  } catch (error: any) {
    console.error("Racing History Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch racing history" },
      { status: 500 }
    );
  }
}
