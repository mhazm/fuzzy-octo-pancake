import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Garage from "@/lib/models/Garage";
import mongoose from "mongoose";
import { checkRateLimit } from "@/lib/rateLimit";

import dbConnect from "@/lib/mongoose";
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


    await dbConnect();

    const client = await clientPromise;
    const db = client.db();

    const garage = await Garage.findOne({ discordId: session.user.discordId });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    const deficit = Math.max(0, (garage.fleetSlotUsed || 0) - garage.fleetSlot);
    const slotsToAdd = deficit > 0 ? deficit + 1 : 1;
    const totalCost = slotsToAdd * UPGRADE_COST;

    // Check balance
    const currencyData = await db.collection("currencies").findOne({ userId: session.user.discordId, guildId: GUILD_ID });
    if (!currencyData || currencyData.totalNC < totalCost) {
      return NextResponse.json({ error: `Saldo NC tidak mencukupi untuk upgrade (Butuh ${totalCost.toLocaleString("id-ID")} NC)` }, { status: 400 });
    }

    // Deduct NC atomically
    const deductRes = await db.collection("currencies").updateOne(
      { userId: session.user.discordId, guildId: GUILD_ID, totalNC: { $gte: totalCost } },
      { $inc: { totalNC: -totalCost } }
    );

    if (deductRes.modifiedCount === 0) {
      return NextResponse.json({ error: "Gagal memotong saldo NC (mungkin saldo tidak cukup)" }, { status: 400 });
    }

    await db.collection("currencyhistories").insertOne({
      userId: session.user.discordId,
      guildId: GUILD_ID,
      amount: totalCost,
      type: "spend",
      reason: `Upgrade Kapasitas Garasi ke Slot ${garage.fleetSlot + slotsToAdd}`,
      createdAt: new Date(),
    });

    // Upgrade Garage
    garage.fleetSlot += slotsToAdd;
    garage.fleetSlotLevel += slotsToAdd;
    garage.fleet_operational_cost = garage.fleetSlot === 1 ? 0 : garage.fleetSlot * OPERATIONAL_COST_PER_SLOT;
    
    // Kalkulasi total (Fleet + Fuel)
    const fuelCost = garage.fuel_operational_cost || 0;
    garage.operational_cost = garage.fleet_operational_cost + fuelCost;
    
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
