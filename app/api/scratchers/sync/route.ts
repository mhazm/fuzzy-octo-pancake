import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ScratchTicket from "@/lib/models/ScratchTicket";
import { redis } from "@/lib/redis";

const GUILD_ID = "863959415702028318";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;

    // 0. Cegah eksekusi ganda (Race Condition) dengan Redis Lock
    const lockKey = `sync_lock:${discordId}`;
    const locked = await redis.setnx(lockKey, "1");
    if (!locked) {
      return NextResponse.json({ message: "Sync already in progress" });
    }
    // Set batas waktu lock maksimal 10 detik
    await redis.expire(lockKey, 10);

    // 1. Ambil data dari Redis
    const spentStr = await redis.get(`scratch_spent:${discordId}`);
    const earnedStr = await redis.get(`scratch_earned:${discordId}`);
    
    const spent = Number(spentStr || 0);
    const earned = Number(earnedStr || 0);
    const netProfit = earned - spent;

    const ticketIds = await redis.lrange(`session_tickets:${discordId}`, 0, -1);
    
    // Jika tidak ada apa-apa untuk disinkron
    if (spent === 0 && earned === 0 && ticketIds.length === 0) {
      return NextResponse.json({ message: "Nothing to sync" });
    }

    // 2. Kumpulkan detail tiket dari Redis
    const ticketsToInsert = [];
    for (const tid of ticketIds) {
      const ticketData = await redis.hgetall(`ticket:${tid}`);
      if (ticketData && Object.keys(ticketData).length > 0) {
        ticketsToInsert.push({
          discordId: discordId,
          ticketType: ticketData.ticketType || "basic",
          price: Number(ticketData.price || 400),
          prizeWon: Number(ticketData.prizeWon || 0),
          isWinning: ticketData.isWinning === true || ticketData.isWinning === "true",
          isScratched: ticketData.isScratched === true || ticketData.isScratched === "true",
          scratchedAt: ticketData.scratchedAt ? new Date(ticketData.scratchedAt as string) : null,
          gameData: typeof ticketData.gameData === "string" ? JSON.parse(ticketData.gameData) : ticketData.gameData,
          createdAt: new Date(ticketData.createdAt as string),
        });
      }
    }

    await clientPromise;
    const client = await clientPromise;
    const db = client.db();

    // 3. Simpan Perubahan Saldo ke MongoDB
    if (netProfit !== 0) {
      await db.collection("currencies").updateOne(
        { userId: discordId, guildId: GUILD_ID },
        { $inc: { totalNC: netProfit } }
      );
    }

    // Catat histori pengeluaran terpisah
    if (spent > 0) {
      await db.collection("currencyhistories").insertOne({
        userId: discordId,
        guildId: GUILD_ID,
        amount: spent,
        type: "spend",
        reason: `Membeli tiket Scratch & Win (${ticketIds.length} tiket)`,
        createdAt: new Date(),
      });
    }

    // Catat histori pendapatan terpisah
    if (earned > 0) {
      await db.collection("currencyhistories").insertOne({
        userId: discordId,
        guildId: GUILD_ID,
        amount: earned,
        type: "earn",
        reason: `Memenangkan hadiah Scratch & Win`,
        createdAt: new Date(),
      });
    }

    // 4. Simpan Tiket ke MongoDB untuk histori jangka panjang
    if (ticketsToInsert.length > 0) {
      await ScratchTicket.insertMany(ticketsToInsert);
    }

    // 5. Bersihkan Sesi Redis
    await redis.del(`scratch_spent:${discordId}`);
    await redis.del(`scratch_earned:${discordId}`);
    await redis.del(`session_tickets:${discordId}`);
    // Hapus detail tiket
    const pipeline = redis.pipeline();
    for (const tid of ticketIds) {
      pipeline.del(`ticket:${tid}`);
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
    console.error("Scratch Sync Error:", error);
    return NextResponse.json(
      { error: "Failed to sync scratch session" },
      { status: 500 }
    );
  }
}
