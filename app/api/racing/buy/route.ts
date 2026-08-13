import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCurrencyData } from "@/app/dashboard/currency/actions";
import { checkRateLimit } from "@/lib/rateLimit";
import { redis } from "@/lib/redis";

const BASE_BET = 500;
const VALID_MULTIPLIERS = [1, 2, 5, 10];
const TRUCK_COUNT = 8;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;

    if (!checkRateLimit(discordId, "racing-buy", 1000)) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Mohon tunggu sesaat." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { truckId, multiplier } = body;

    if (
      !truckId ||
      typeof truckId !== "number" ||
      truckId < 1 ||
      truckId > TRUCK_COUNT
    ) {
      return NextResponse.json(
        { error: "Invalid truck selection" },
        { status: 400 },
      );
    }

    if (!multiplier || !VALID_MULTIPLIERS.includes(multiplier)) {
      return NextResponse.json(
        { error: "Invalid multiplier" },
        { status: 400 },
      );
    }

    const totalBet = BASE_BET * multiplier;

    // Hitung estimasi saldo dengan Redis
    let currencyData;
    try {
      currencyData = await getCurrencyData();
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to fetch currency" },
        { status: 500 },
      );
    }

    const spentStr = await redis.get(`racing_spent:${discordId}`);
    const earnedStr = await redis.get(`racing_earned:${discordId}`);
    const netRedis = Number(earnedStr || 0) - Number(spentStr || 0);
    const estimatedBalance = currencyData.balance + netRedis;

    if (estimatedBalance < totalBet) {
      return NextResponse.json(
        { error: "Saldo Nismara Coin tidak mencukupi" },
        { status: 400 },
      );
    }

    // Catat pengeluaran sesi ke Redis
    await redis.incrby(`racing_spent:${discordId}`, totalBet);
    await redis.expire(`racing_spent:${discordId}`, 3600);

    // RNG to determine winning truck (1 to 8)
    const winningTruckId = Math.floor(Math.random() * TRUCK_COUNT) + 1;
    const isWinning = winningTruckId === truckId;
    const prizeWon = isWinning ? totalBet * 3 : 0;

    if (isWinning) {
      await redis.incrby(`racing_earned:${discordId}`, prizeWon);
      await redis.expire(`racing_earned:${discordId}`, 3600);
    }

    // Buat tiket di Redis
    const ticketId = `redis_racing_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const ticketData = {
      _id: ticketId,
      discordId,
      truckId,
      winningTruckId,
      multiplier,
      betAmount: totalBet,
      prizeWon,
      isWinning: isWinning.toString(),
      createdAt: new Date().toISOString(),
    };

    await redis.hset(`racing_ticket:${ticketId}`, ticketData);
    await redis.expire(`racing_ticket:${ticketId}`, 3600);

    await redis.rpush(`racing_session_tickets:${discordId}`, ticketId);
    await redis.expire(`racing_session_tickets:${discordId}`, 3600);

    return NextResponse.json({
      message: "Race started successfully",
      ticketId: ticketId,
      winningTruckId,
      prizeWon,
    });
  } catch (error: any) {
    console.error("Racing Buy Error:", error);
    return NextResponse.json(
      { error: "Failed to process racing bet" },
      { status: 500 },
    );
  }
}
