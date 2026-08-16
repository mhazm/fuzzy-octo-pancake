import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCurrencyDataLogic } from "@/lib/currency";
import { checkRateLimit } from "@/lib/rateLimit";
import { logExtremeActivity } from "@/lib/securityLogger";
import { redis } from "@/lib/redis";
import { generate100xTicket } from "@/lib/scratch100xGenerator";

const GUILD_ID = "863959415702028318";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const body = await req.json().catch(() => ({}));
    const ticketType = body.ticketType || "basic";

    const TICKET_PRICE = ticketType === "100x" ? 1000 : 400;

    if (!checkRateLimit(discordId, "scratchers-buy", 1000)) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Mohon tunggu sesaat." },
        { status: 429 },
      );
    }

    // Cek saldo dengan memperhitungkan pengeluaran sesi saat ini yang masih ada di Redis.
    // Arsitektur Redis-first: MongoDB hanya ditulis saat sync di akhir sesi (bukan per-tiket),
    // sehingga estimasi saldo real = saldo MongoDB + (earned Redis - spent Redis).
    let currencyData;
    try {
      currencyData = await getCurrencyDataLogic();
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to fetch currency" },
        { status: 500 },
      );
    }

    const spentStr = await redis.get(`scratch_spent:${discordId}`);
    const earnedStr = await redis.get(`scratch_earned:${discordId}`);
    const netRedis = Number(earnedStr || 0) - Number(spentStr || 0);
    const estimatedBalance = currencyData.balance + netRedis;

    if (estimatedBalance < TICKET_PRICE) {
      return NextResponse.json(
        { error: "Saldo Nismara Coin tidak mencukupi" },
        { status: 400 },
      );
    }

    // Catat pengeluaran sesi ke Redis (tidak menyentuh MongoDB sama sekali)
    await redis.incrby(`scratch_spent:${discordId}`, TICKET_PRICE);
    await redis.expire(`scratch_spent:${discordId}`, 3600);

    // Determine prize based on RNG and probability table
    const rand = Math.random();
    let prizeWon = 0;

    if (ticketType === "100x") {
      // Distribusi 100x Ticket (Harga 1000)
      if (rand < 0.0005) {
        prizeWon = 100000; // 0.05% Jackpot
      } else if (rand < 0.01) {
        prizeWon = 20000; // 0.95%
      } else if (rand < 0.05) {
        prizeWon = 5000; // 4%
      } else if (rand < 0.15) {
        prizeWon = 2000; // 10%
      } else if (rand < 0.35) {
        prizeWon = 1000; // 20% Balik Modal
      } else {
        prizeWon = 0; // 65% Kalah
      }
    } else {
      // Distribusi Basic Ticket (Harga 400)
      if (rand < 0.002) {
        prizeWon = 20000;
      } else if (rand < 0.02) {
        prizeWon = 4000;
      } else if (rand < 0.07) {
        prizeWon = 2000;
      } else if (rand < 0.15) {
        prizeWon = 800; // 8% chance
      } else if (rand < 0.45) {
        prizeWon = 400; // 30% chance (Balik modal yang lebih sering!)
      } else {
        prizeWon = 0; // 55% chance kalah
      }
    }

    let gameData = null;
    if (ticketType === "100x") {
      gameData = generate100xTicket(prizeWon);
    }

    // 2. Buat tiket di Redis (Super Cepat)
    const ticketId = `redis_ticket_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ticketData = {
      _id: ticketId,
      discordId,
      ticketType,
      price: TICKET_PRICE,
      prizeWon,
      isWinning: prizeWon > 0,
      isScratched: false,
      gameData: gameData ? JSON.stringify(gameData) : null,
      createdAt: new Date().toISOString(),
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
      ticketType: ticketType,
      prizeWon: prizeWon,
      gameData: gameData,
      warningLimitReached: isWarningLimit,
    });
  } catch (error: any) {
    console.error("Scratch Buy Error:", error);
    return NextResponse.json(
      { error: "Failed to process ticket purchase" },
      { status: 500 },
    );
  }
}
