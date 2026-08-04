import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ScratchTicket from "@/lib/models/ScratchTicket";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;
    await clientPromise;

    // Fetch last 10 tickets
    const recentTickets = await ScratchTicket.find({ discordId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Calculate stats
    const statsResult = await ScratchTicket.aggregate([
      { $match: { discordId } },
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          totalSpent: { $sum: "$price" },
          totalWon: {
            $sum: {
              $cond: [{ $eq: ["$isScratched", true] }, "$prizeWon", 0],
            },
          },
        },
      },
    ]);

    const stats = statsResult[0] || {
      totalTickets: 0,
      totalSpent: 0,
      totalWon: 0,
    };

    return NextResponse.json({
      recentTickets,
      stats,
    });
  } catch (error: any) {
    console.error("Scratch History Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
