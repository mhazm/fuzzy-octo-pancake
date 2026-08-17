import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all";

    // Cek cache Redis (berlaku 15 menit)
    const cacheKey = `timezone:leaderboard:${period}`;
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return NextResponse.json({
        success: true,
        ...JSON.parse(cachedData),
        cached: true,
      });
    }

    let matchQuery: any = {};
    if (period === "monthly") {
      const now = new Date();
      const startOfMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const startOfMonthStr = startOfMonthDate.toISOString();
      const endOfMonthStr = endOfMonthDate.toISOString();

      matchQuery = {
        $or: [
          { createdAt: { $gte: startOfMonthDate, $lte: endOfMonthDate } },
          { createdAt: { $gte: startOfMonthStr, $lte: endOfMonthStr } }
        ]
      };
    }

    const client = await clientPromise;
    const db = client.db();

    // Aggregate scratchers and racing
    const stats = await db.collection("scratchtickets").aggregate([
      { $match: matchQuery },
      { $project: { discordId: 1, spent: "$price", won: "$prizeWon" } },
      { $unionWith: {
          coll: "racingtickets",
          pipeline: [
            { $match: matchQuery },
            { $project: { discordId: 1, spent: "$betAmount", won: "$prizeWon" } }
          ]
        }
      },
      { $group: {
          _id: "$discordId",
          totalSpent: { $sum: "$spent" },
          totalWon: { $sum: "$won" },
          totalGames: { $sum: 1 }
        }
      },
      { $addFields: { netProfit: { $subtract: ["$totalWon", "$totalSpent"] } } }
    ]).toArray();

    // memory sort 
    stats.sort((a, b) => b.netProfit - a.netProfit);
    const topWinners = stats.filter(s => s.netProfit > 0).slice(0, 10);
    
    // Sort ascending for losers (most negative netProfit)
    const topLosersRaw = [...stats].sort((a, b) => a.netProfit - b.netProfit);
    const topLosers = topLosersRaw.filter(s => s.netProfit < 0).slice(0, 10);

    // Get user details
    const userIdsToFetch = [...new Set([...topWinners, ...topLosers].map(s => s._id))];
    
    const users = await db.collection("users").find(
      { discordId: { $in: userIdsToFetch } },
      { projection: { discordId: 1, name: 1, image: 1, avatarUrl: 1, nismaraplus: 1, role: 1, discordRole: 1, truckyRank: 1 } }
    ).toArray();

    const userMap = users.reduce((acc, u) => {
      acc[u.discordId] = {
        name: u.name || "Unknown Driver",
        avatarUrl: u.image || u.avatarUrl || `https://ui-avatars.com/api/?name=Driver&background=random`,
        isNismaraPlus: u.nismaraplus?.status === true,
        nismaraPlusStartedAt: u.nismaraplus?.startedAt,
        isManager: u.role === "manager" || u.role === "admin" || u.discordRole === "manager" || u.discordRole === "admin",
        truckyRank: u.truckyRank
      };
      return acc;
    }, {} as Record<string, any>);

    const formatData = (list: any[]) => list.map(item => ({
      discordId: item._id,
      totalSpent: item.totalSpent,
      totalWon: item.totalWon,
      totalGames: item.totalGames,
      netProfit: item.netProfit,
      user: userMap[item._id] || { name: "Unknown Driver", avatarUrl: null }
    }));

    const resultPayload = {
      winners: formatData(topWinners),
      losers: formatData(topLosers)
    };

    // Simpan ke Redis (Expire dalam 15 menit / 900 detik)
    await redis.setex(cacheKey, 900, JSON.stringify(resultPayload));

    return NextResponse.json({
      success: true,
      ...resultPayload,
      cached: false
    });

  } catch (error) {
    console.error("Error fetching timezone leaderboard:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
