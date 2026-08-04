import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Garage from "@/lib/models/Garage";
import mongoose from "mongoose";
import { checkRateLimit } from "@/lib/rateLimit";

const GUILD_ID = "863959415702028318";
const UPGRADE_COST = 1000;
const OPERATIONAL_COST_PER_SLOT = 250;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;
    if (!checkRateLimit(discordId, "garage-upgrade", 1000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Mohon tunggu sesaat." }, { status: 429 });
    }


    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const client = await clientPromise;
    const db = client.db();

    const garage = await Garage.findOne({ discordId: session.user.discordId });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Check balance
    const currencyData = await db.collection("currencies").findOne({ userId: session.user.discordId, guildId: GUILD_ID });
    if (!currencyData || currencyData.totalNC < UPGRADE_COST) {
      return NextResponse.json({ error: "Saldo NC tidak mencukupi untuk upgrade (Butuh 1.000 NC)" }, { status: 400 });
    }

    // Deduct NC atomically
    const deductRes = await db.collection("currencies").updateOne(
      { userId: session.user.discordId, guildId: GUILD_ID, totalNC: { $gte: UPGRADE_COST } },
      { $inc: { totalNC: -UPGRADE_COST } }
    );

    if (deductRes.modifiedCount === 0) {
      return NextResponse.json({ error: "Gagal memotong saldo NC (mungkin saldo tidak cukup)" }, { status: 400 });
    }

    await db.collection("currencyhistories").insertOne({
      userId: session.user.discordId,
      guildId: GUILD_ID,
      amount: UPGRADE_COST,
      type: "spend",
      reason: `Upgrade Kapasitas Garasi ke Slot ${garage.fleetSlot + 1}`,
      createdAt: new Date(),
    });

    // Upgrade Garage
    garage.fleetSlot += 1;
    garage.fleetSlotLevel += 1;
    garage.operational_cost = garage.fleetSlot === 1 ? 0 : garage.fleetSlot * OPERATIONAL_COST_PER_SLOT;
    
    await garage.save();

    return NextResponse.json({ 
      success: true, 
      message: `Garasi berhasil di-upgrade ke Slot ${garage.fleetSlot}`
    });

  } catch (error: any) {
    console.error("Upgrade Garage Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
