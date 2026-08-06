import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ScratchTicket from "@/lib/models/ScratchTicket";
import { redis } from "@/lib/redis";

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

    // Calculate stats dari MongoDB
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

    let stats = statsResult[0] || {
      totalTickets: 0,
      totalSpent: 0,
      totalWon: 0,
    };

    // Sisipkan tiket dari Redis (Write-Behind)
    const redisTicketIds = await redis.lrange(`session_tickets:${discordId}`, 0, -1);
    const redisTickets = [];
    
    for (const tid of redisTicketIds) {
      const t = await redis.hgetall(`ticket:${tid}`);
      if (t && Object.keys(t).length > 0) {
        const isScratched = t.isScratched === true || t.isScratched === "true";
        const price = Number(t.price || 400);
        const prizeWon = Number(t.prizeWon || 0);
        
        redisTickets.push({
          _id: t._id,
          discordId: t.discordId,
          ticketType: t.ticketType || "basic",
          price,
          prizeWon,
          isWinning: t.isWinning === true || t.isWinning === "true",
          isScratched,
          scratchedAt: t.scratchedAt || null,
          gameData: typeof t.gameData === "string" ? JSON.parse(t.gameData) : t.gameData,
          createdAt: t.createdAt,
        });

        stats.totalTickets += 1;
        stats.totalSpent += price;
        if (isScratched) {
          stats.totalWon += prizeWon;
        }
      }
    }

    // Gabungkan (Redis di depan karena lebih baru)
    const combinedTickets = [...redisTickets.reverse(), ...recentTickets].slice(0, 10);

    return NextResponse.json({
      recentTickets: combinedTickets,
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
