import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import RacingTicket from "@/lib/models/RacingTicket";
import dbConnect from "@/lib/mongoose";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;

    await dbConnect();
    await clientPromise;

    // 1. Ambil dari MongoDB
    const recentDbTickets = await RacingTicket.find({ discordId })
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

    let dbStats = statsAgg[0] || {
      totalTickets: 0,
      totalSpent: 0,
      totalWon: 0,
    };

    // 2. Ambil dari Redis (yang belum disync)
    const redisTicketIds = await redis.lrange(
      `racing_session_tickets:${discordId}`,
      0,
      -1
    );

    const redisTickets = [];
    let redisSpent = 0;
    let redisWon = 0;

    for (const tid of redisTicketIds) {
      const tData = await redis.hgetall(`racing_ticket:${tid}`);
      if (tData && Object.keys(tData).length > 0) {
        const betAmount = Number(tData.betAmount);
        const prizeWon = Number(tData.prizeWon);
        
        redisSpent += betAmount;
        redisWon += prizeWon;

        redisTickets.push({
          _id: tData._id,
          truckId: Number(tData.truckId),
          winningTruckId: Number(tData.winningTruckId),
          multiplier: Number(tData.multiplier),
          betAmount: betAmount,
          prizeWon: prizeWon,
          isWinning: String(tData.isWinning) === "true",
          createdAt: tData.createdAt,
        });
      }
    }

    // Sort redis tickets (terbaru di atas)
    redisTickets.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Gabungkan
    const mergedTickets = [...redisTickets, ...recentDbTickets].slice(0, 10);

    const mergedStats = {
      totalTickets: dbStats.totalTickets + redisTickets.length,
      totalSpent: dbStats.totalSpent + redisSpent,
      totalWon: dbStats.totalWon + redisWon,
    };

    return NextResponse.json({
      stats: mergedStats,
      recentTickets: mergedTickets,
    });
  } catch (error: any) {
    console.error("Racing History Error:", error);
    return NextResponse.json(
      { error: "Failed to load history" },
      { status: 500 }
    );
  }
}
