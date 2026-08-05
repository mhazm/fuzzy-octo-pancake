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

    // 1. Ambil data dari Redis
    const netProfitStr = await redis.get(`net_profit:${discordId}`);
    const netProfit = Number(netProfitStr || 0);

    const ticketIds = await redis.lrange(`session_tickets:${discordId}`, 0, -1);
    
    // Jika tidak ada apa-apa untuk disinkron
    if (netProfit === 0 && ticketIds.length === 0) {
      return NextResponse.json({ message: "Nothing to sync" });
    }

    // 2. Kumpulkan detail tiket dari Redis
    const ticketsToInsert = [];
    for (const tid of ticketIds) {
      const ticketData = await redis.hgetall(`ticket:${tid}`);
      if (ticketData && Object.keys(ticketData).length > 0) {
        ticketsToInsert.push({
          discordId: discordId,
          price: Number(ticketData.price || 400),
          prizeWon: Number(ticketData.prizeWon || 0),
          isWinning: ticketData.isWinning === true || ticketData.isWinning === "true",
          isScratched: ticketData.isScratched === true || ticketData.isScratched === "true",
          scratchedAt: ticketData.scratchedAt ? new Date(ticketData.scratchedAt as string) : null,
          createdAt: new Date(ticketData.createdAt as string),
        });
      }
    }

    await clientPromise;
    const client = await clientPromise;
    const db = client.db();

    // 3. Simpan Net Profit ke MongoDB
    if (netProfit !== 0) {
      const updateRes = await db
        .collection("currencies")
        .updateOne(
          { userId: discordId, guildId: GUILD_ID },
          { $inc: { totalNC: netProfit } }
        );

      if (updateRes.modifiedCount > 0) {
        // Catat sebagai 1 histori ringkasan agar tidak spam
        await db.collection("currencyhistories").insertOne({
          userId: discordId,
          guildId: GUILD_ID,
          amount: Math.abs(netProfit),
          type: netProfit > 0 ? "earn" : "spend",
          reason: `Hasil sesi main Scratchers (${ticketIds.length} tiket)`,
          createdAt: new Date(),
        });
      }
    }

    // 4. Simpan Tiket ke MongoDB untuk histori jangka panjang
    if (ticketsToInsert.length > 0) {
      await ScratchTicket.insertMany(ticketsToInsert);
    }

    // 5. Bersihkan Sesi Redis
    await redis.del(`net_profit:${discordId}`);
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
