import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ScratchTicket from "@/lib/models/ScratchTicket";
import { getCurrencyData } from "@/app/dashboard/currency/actions";
import { checkRateLimit } from "@/lib/rateLimit";
import { logExtremeActivity } from "@/lib/securityLogger";

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
      return NextResponse.json(
        { error: "Saldo Nismara Coin tidak mencukupi" },
        { status: 400 }
      );
    }

    await clientPromise;
    const client = await clientPromise;
    const db = client.db();

    // Deduct balance atomically (Prevents Race Condition exploits)
    const updateRes = await db
      .collection("currencies")
      .updateOne(
        { userId: discordId, guildId: GUILD_ID, totalNC: { $gte: TICKET_PRICE } },
        { $inc: { totalNC: -TICKET_PRICE } }
      );

    if (updateRes.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Gagal memotong saldo NC" },
        { status: 500 }
      );
    }

    // Log the spend
    await db.collection("currencyhistories").insertOne({
      userId: discordId,
      guildId: GUILD_ID,
      amount: TICKET_PRICE,
      type: "spend",
      reason: `Membeli 1 Tiket Scratch & Win`,
      createdAt: new Date(),
    });

    // Determine prize based on RNG and probability table
    const rand = Math.random();
    let prizeWon = 0;
    
    // Distribution:
    // Jackpot (0.5%): < 0.005
    // Menang Besar (1.5%): 0.005 - 0.02
    // Menang Sedang (5%): 0.02 - 0.07
    // Menang Kecil (8%): 0.07 - 0.15
    // Balik Modal (10%): 0.15 - 0.25
    // Kalah (75%): >= 0.25
    
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

    // Count tickets bought today for warning
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await ScratchTicket.countDocuments({
      discordId,
      createdAt: { $gte: startOfDay }
    });
    const isWarningLimit = todayCount === 49; // 50th ticket

    // Create ticket in DB
    const newTicket = new ScratchTicket({
      discordId,
      price: TICKET_PRICE,
      prizeWon,
      isWinning: prizeWon > 0,
      isScratched: false,
    });
    
    await newTicket.save();

    return NextResponse.json({
      message: "Ticket purchased successfully",
      ticketId: newTicket._id,
      prizeWon: newTicket.prizeWon,
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
