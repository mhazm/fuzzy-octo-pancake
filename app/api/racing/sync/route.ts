import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import RacingTicket from "@/lib/models/RacingTicket";
import { redis } from "@/lib/redis";
import dbConnect from "@/lib/mongoose";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "863959415702028318";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;

    // 0. Prevent race conditions with Redis Lock
    const lockKey = `racing_sync_lock:${discordId}`;
    const locked = await redis.setnx(lockKey, "1");
    if (!locked) {
      return NextResponse.json({ message: "Sync already in progress" });
    }
    await redis.expire(lockKey, 10);

    // 1. Fetch data from Redis
    const spentStr = await redis.get(`racing_spent:${discordId}`);
    const earnedStr = await redis.get(`racing_earned:${discordId}`);
    
    const spent = Number(spentStr || 0);
    const earned = Number(earnedStr || 0);
    const netProfit = earned - spent;

    const ticketIds = await redis.lrange(`racing_session_tickets:${discordId}`, 0, -1);
    
    if (spent === 0 && earned === 0 && ticketIds.length === 0) {
      return NextResponse.json({ message: "Nothing to sync" });
    }

    // 2. Fetch ticket details from Redis
    const ticketsToInsert = [];
    for (const tid of ticketIds) {
      const ticketData = await redis.hgetall(`racing_ticket:${tid}`);
      if (ticketData && Object.keys(ticketData).length > 0) {
        ticketsToInsert.push({
          discordId: discordId,
          truckId: Number(ticketData.truckId),
          winningTruckId: Number(ticketData.winningTruckId),
          multiplier: Number(ticketData.multiplier),
          betAmount: Number(ticketData.betAmount),
          prizeWon: Number(ticketData.prizeWon),
          isWinning: String(ticketData.isWinning) === "true",
          createdAt: new Date(ticketData.createdAt as string),
        });
      }
    }

    await dbConnect();
    const client = await clientPromise;
    const db = client.db();

    // 3. Batch write balance changes
    if (netProfit !== 0) {
      await db.collection("currencies").updateOne(
        { userId: discordId, guildId: GUILD_ID },
        { $inc: { totalNC: netProfit } }
      );
    }

    // 4. Record histories
    if (spent > 0) {
      await db.collection("currencyhistories").insertOne({
        userId: discordId,
        guildId: GUILD_ID,
        amount: spent,
        type: "spend",
        reason: `Taruhan Balap Truk (${ticketIds.length} tiket)`,
        createdAt: new Date(),
      });
    }

    if (earned > 0) {
      await db.collection("currencyhistories").insertOne({
        userId: discordId,
        guildId: GUILD_ID,
        amount: earned,
        type: "earn",
        reason: `Memenangkan Balap Truk`,
        createdAt: new Date(),
      });
    }

    // 5. Save tickets for long-term history
    if (ticketsToInsert.length > 0) {
      await RacingTicket.insertMany(ticketsToInsert);
    }

    // 6. Clean up Redis session
    await redis.del(`racing_spent:${discordId}`);
    await redis.del(`racing_earned:${discordId}`);
    await redis.del(`racing_session_tickets:${discordId}`);
    
    const pipeline = redis.pipeline();
    for (const tid of ticketIds) {
      pipeline.del(`racing_ticket:${tid}`);
    }
    if (ticketIds.length > 0) {
      await pipeline.exec();
    }

    return NextResponse.json({
      message: "Sync completed successfully",
      syncedTickets: ticketsToInsert.length,
      netProfit: netProfit
    });

  } catch (error: any) {
    console.error("Racing Sync Error:", error);
    return NextResponse.json(
      { error: "Failed to sync racing session" },
      { status: 500 }
    );
  }
}
