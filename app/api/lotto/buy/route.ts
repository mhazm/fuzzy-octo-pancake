import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LottoPeriod from "@/lib/models/LottoPeriod";
import LottoTicket from "@/lib/models/LottoTicket";
import { getCurrencyData } from "@/app/dashboard/currency/actions";
import { checkRateLimit } from "@/lib/rateLimit";

const GUILD_ID = "863959415702028318";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.isDriver) {
      return NextResponse.json(
        { error: "Only official drivers can buy tickets" },
        { status: 403 },
      );
    }

    const discordId = session.user.discordId;

    if (!checkRateLimit(discordId, "lotto-buy", 1000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Mohon tunggu sesaat." }, { status: 429 });
    }

    const { numbers } = await req.json();

    if (!Array.isArray(numbers) || numbers.length !== 4) {
      return NextResponse.json(
        { error: "Invalid numbers provided" },
        { status: 400 },
      );
    }

    // Validate numbers range (1-69)
    for (let num of numbers) {
      if (typeof num !== "number" || num < 1 || num > 69) {
        return NextResponse.json(
          { error: "Numbers must be between 1 and 69" },
          { status: 400 },
        );
      }
    }

    // Check for duplicates
    if (new Set(numbers).size !== numbers.length) {
      return NextResponse.json(
        { error: "Numbers must be unique" },
        { status: 400 },
      );
    }

    await clientPromise;

    // Check if there's an active OPEN period
    const activePeriod = await LottoPeriod.findOne({ status: "OPEN" });
    if (!activePeriod) {
      return NextResponse.json(
        { error: "No active lotto period" },
        { status: 400 },
      );
    }

    // Check user balance
    let currencyData;
    try {
      currencyData = await getCurrencyData();
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to fetch currency" },
        { status: 500 },
      );
    }

    const ticketPrice = 500;
    if (currencyData.balance < ticketPrice) {
      return NextResponse.json(
        { error: "Saldo Nismara Coin tidak mencukupi" },
        { status: 400 },
      );
    }

    // Check max tickets (10 per week/period)
    const ticketsBought = await LottoTicket.countDocuments({
      periodId: activePeriod._id,
      discordId,
    });

    if (ticketsBought >= 10) {
      return NextResponse.json(
        {
          error:
            "You have reached the maximum limit of 10 tickets for this period.",
        },
        { status: 400 },
      );
    }

    // Process Purchase
    const client = await clientPromise;
    const db = client.db();

    const updateRes = await db
      .collection("currencies")
      .updateOne(
        { userId: discordId, guildId: GUILD_ID, totalNC: { $gte: ticketPrice } },
        { $inc: { totalNC: -ticketPrice } },
      );

    if (updateRes.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Gagal memotong saldo NC" },
        { status: 500 },
      );
    }

    // Log to currencyhistories
    await db.collection("currencyhistories").insertOne({
      userId: discordId,
      guildId: GUILD_ID,
      amount: ticketPrice,
      type: "spend",
      reason: `Membeli 1 Tiket Nismara Lotto (Periode #${activePeriod.periodNumber})`,
      createdAt: new Date(),
    });

    const newTicket = new LottoTicket({
      periodId: activePeriod._id,
      discordId,
      numbers: numbers.sort((a: number, b: number) => a - b),
    });
    await newTicket.save();

    // 80% (400 NC) to prize pool, 20% (100 NC) burned
    activePeriod.accumulatedPrize += ticketPrice * 0.8;
    await activePeriod.save();

    return NextResponse.json({
      message: "Ticket purchased successfully",
      ticket: newTicket,
    });
  } catch (error: any) {
    console.error("Lotto Buy Error:", error);
    return NextResponse.json(
      { error: "Failed to process ticket purchase" },
      { status: 500 },
    );
  }
}
