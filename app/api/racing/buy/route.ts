import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import RacingTicket from "@/lib/models/RacingTicket";
import { getCurrencyData } from "@/app/dashboard/currency/actions";
import { checkRateLimit } from "@/lib/rateLimit";
import { logExtremeActivity } from "@/lib/securityLogger";

const GUILD_ID = process.env.DISCORD_GUILD_ID;
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

    // Check balance
    let currencyData;
    try {
      currencyData = await getCurrencyData();
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to fetch currency" },
        { status: 500 },
      );
    }

    if (currencyData.balance < totalBet) {
      return NextResponse.json(
        { error: "Saldo Nismara Coin tidak mencukupi" },
        { status: 400 },
      );
    }

    await clientPromise;
    const client = await clientPromise;
    const db = client.db();

    // Deduct balance atomically (Prevents Race Condition exploits)
    const updateRes = await db
      .collection("currencies")
      .updateOne(
        { userId: discordId, guildId: GUILD_ID, totalNC: { $gte: totalBet } },
        { $inc: { totalNC: -totalBet } },
      );

    if (updateRes.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Gagal memotong saldo NC" },
        { status: 500 },
      );
    }

    // Log the spend
    await db.collection("currencyhistories").insertOne({
      userId: discordId,
      guildId: GUILD_ID,
      amount: totalBet,
      type: "spend",
      reason: `Taruhan Balap Truk (x${multiplier})`,
      createdAt: new Date(),
    });

    // RNG to determine winning truck (1 to 8)
    // 12.5% chance for any truck
    const winningTruckId = Math.floor(Math.random() * TRUCK_COUNT) + 1;

    const isWinning = winningTruckId === truckId;
    const prizeWon = isWinning ? totalBet * 3 : 0;

    if (isWinning) {
      // Award prize immediately
      await db
        .collection("currencies")
        .updateOne(
          { userId: discordId, guildId: GUILD_ID },
          { $inc: { totalNC: prizeWon } },
        );

      await db.collection("currencyhistories").insertOne({
        userId: discordId,
        guildId: GUILD_ID,
        amount: prizeWon,
        type: "earn",
        reason: `Menang Balap Truk! (Hadiah 3x)`,
        createdAt: new Date(),
      });

      // Log extreme winnings
      await logExtremeActivity(
        discordId,
        "RACING_WIN",
        prizeWon,
        `Menang balap truk dengan taruhan x${multiplier}`,
      );
    }

    // Create ticket in DB
    const newTicket = new RacingTicket({
      discordId,
      truckId,
      winningTruckId,
      multiplier,
      betAmount: totalBet,
      prizeWon,
      isWinning,
    });

    await newTicket.save();

    return NextResponse.json({
      message: "Race started successfully",
      ticketId: newTicket._id,
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
