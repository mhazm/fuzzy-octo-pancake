import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getCompanyMemberStats } from "@/lib/trucky";
import { getUserAggregatedStats } from "@/lib/userStats";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ discordId: string }> }
) {
  try {
    const { discordId } = await params;
    const expectedToken = process.env.NISMARA_SECRET_API;
    const authHeader = request.headers.get("authorization");

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const guildId = process.env.DISCORD_GUILD_ID;
    const NISMARA_COMPANY_ID = process.env.TRUCKY_COMPANY_ID;

    // 1. Ambil data user berdasarkan discordId
    const user = await db.collection("users").findOne({ discordId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Buat query yang menyertakan userId milik si target user
    const fullTargetQuery: any = {
      $or: [
        { userId: user.discordId },
        { userId: Number(user.discordId) },
      ],
    };

    if (user.truckyId) {
      fullTargetQuery.$or.push(
        { truckyId: user.truckyId },
        { truckyId: Number(user.truckyId) }
      );
    }

    const [
      recentJobs,
      userNc,
      userPoint,
      leaveHistory,
      driverLink,
    ] = await Promise.all([
      db
        .collection("jobhistories")
        .find({ ...fullTargetQuery, guildId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .toArray(),
      db.collection("currencies").findOne({ ...fullTargetQuery, guildId }),
      db.collection("points").findOne({ ...fullTargetQuery, guildId }),
      db
        .collection("leavehistories")
        .find({ ...fullTargetQuery })
        .sort({ startDate: -1 })
        .toArray(),
      db.collection("driverlinks").findOne({ ...fullTargetQuery, guildId }),
    ]);

    let memberData = null;
    if (user.truckyId) {
      memberData = await getCompanyMemberStats(
        Number(NISMARA_COMPANY_ID),
        Number(user.truckyId)
      );
    }

    const userStats = await getUserAggregatedStats(user.discordId, user._id);

    return NextResponse.json({
      user,
      userStats,
      jobs: recentJobs,
      userNc: userNc || { totalNC: 0 },
      userPoint: userPoint || { totalPoints: 0 },
      leaveHistory,
      memberData,
      driverLink,
    });
  } catch (error) {
    console.error("Error fetching user detail API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
