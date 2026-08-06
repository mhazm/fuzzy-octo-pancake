import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ScratchTicket from "@/lib/models/ScratchTicket";
import { getCurrencyData } from "@/app/dashboard/currency/actions";
import { checkRateLimit } from "@/lib/rateLimit";
import { logExtremeActivity } from "@/lib/securityLogger";
import { redis } from "@/lib/redis";

const GUILD_ID = "863959415702028318";
const TICKET_PRICE = 400;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;

    if (!checkRateLimit(discordId, "scratchers-buy", 1000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Mohon tunggu sesaat." }, { status: 429 });
    }


    // Check balance
    let currencyData;
    try {
      currencyData = await getCurrencyData();
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to fetch currency" },
        { status: 500 }
      );
    }

    if (currencyData.balance < TICKET_PRICE) {
      // Tunggu, karena ada state di Redis, kita harus hitung real balance
      const spentStr = await redis.get(`scratch_spent:${discordId}`);
      const earnedStr = await redis.get(`scratch_earned:${discordId}`);
      const netProfit = Number(earnedStr || 0) - Number(spentStr || 0);
      const estimatedBalance = currencyData.balance + netProfit;

      if (estimatedBalance < TICKET_PRICE) {
        return NextResponse.json(
          { error: "Saldo Nismara Coin tidak mencukupi" },
          { status: 400 }
        );
      }
    } else {
      const spentStr = await redis.get(`scratch_spent:${discordId}`);
      const earnedStr = await redis.get(`scratch_earned:${discordId}`);
      const netProfit = Number(earnedStr || 0) - Number(spentStr || 0);
      const estimatedBalance = currencyData.balance + netProfit;
      if (estimatedBalance < TICKET_PRICE) {
        return NextResponse.json(
          { error: "Saldo Nismara Coin tidak mencukupi (termasuk potongan sebelumnya)" },
          { status: 400 }
        );
      }
    }

    // 1. Tambah scratch_spent di Redis (Super Cepat)
    await redis.incrby(`scratch_spent:${discordId}`, TICKET_PRICE);
    await redis.expire(`scratch_spent:${discordId}`, 3600);

    // Determine prize based on RNG and probability table
    const rand = Math.random();
    let prizeWon = 0;
    
    // Distribution:
    if (rand < 0.005) {
      prizeWon = 20000;
    } else if (rand < 0.02) {
      prizeWon = 4000;
    } else if (rand < 0.07) {
      prizeWon = 2000;
    } else if (rand < 0.15) {
      prizeWon = 800;
    } else if (rand < 0.25) {
      prizeWon = 400;
    } else {
      prizeWon = 0;
    }

    // 2. Buat tiket di Redis (Super Cepat)
    const ticketId = `redis_ticket_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ticketData = {
      _id: ticketId,
      discordId,
      price: TICKET_PRICE,
      prizeWon,
      isWinning: prizeWon > 0,
      isScratched: false,
      createdAt: new Date().toISOString()
    };

    await redis.hset(`ticket:${ticketId}`, ticketData);
    await redis.expire(`ticket:${ticketId}`, 3600);

    await redis.rpush(`session_tickets:${discordId}`, ticketId);
    await redis.expire(`session_tickets:${discordId}`, 3600);

    // Untuk fitur limit, kita lewati peringatan batas 50 dari MongoDB karena state terdistribusi.
    // Atau bisa kita count dari list session_tickets
    const listLen = await redis.llen(`session_tickets:${discordId}`);
    const isWarningLimit = listLen >= 49;

    return NextResponse.json({
      message: "Ticket purchased successfully",
      ticketId: ticketId,
      prizeWon: prizeWon,
      warningLimitReached: isWarningLimit
    });
  } catch (error: any) {
    console.error("Scratch Buy Error:", error);
    return NextResponse.json(
      { error: "Failed to process ticket purchase" },
      { status: 500 }
    );
  }
}
