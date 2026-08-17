import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Garage from "@/lib/models/Garage";
import mongoose from "mongoose";

import dbConnect from "@/lib/mongoose";
const DOWNGRADE_COST = 500;
const GUILD_ID = process.env.GUILD_ID || "863959415702028318";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const garage = await Garage.findOne({ discordId: session.user.discordId });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    if (garage.fleetSlot <= 1) {
      return NextResponse.json({ error: "Tidak bisa downgrade. Kapasitas minimal adalah 1 Slot." }, { status: 400 });
    }

    if (garage.fleetSlotUsed >= garage.fleetSlot) {
      return NextResponse.json({ error: "Tidak bisa downgrade. Harap jual/keluarkan kendaraan dari slot terlebih dahulu." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Cek saldo
    const currencyData = await db.collection("currencies").findOne({ userId: session.user.discordId, guildId: GUILD_ID });
    if (!currencyData || currencyData.totalNC < DOWNGRADE_COST) {
      return NextResponse.json({ error: `Saldo NC tidak mencukupi untuk downgrade (Butuh ${DOWNGRADE_COST} NC)` }, { status: 400 });
    }

    // Deduct NC
    await db.collection("currencies").updateOne(
      { userId: session.user.discordId, guildId: GUILD_ID },
      { $inc: { totalNC: -DOWNGRADE_COST } }
    );

    // Record history
    await db.collection("currencyhistories").insertOne({
      userId: session.user.discordId,
      guildId: GUILD_ID,
      amount: DOWNGRADE_COST,
      type: "spend",
      reason: `Downgrade Kapasitas Garasi ke Slot ${garage.fleetSlot - 1}`,
      createdAt: new Date(),
    });

    // Downgrade Garage
    garage.fleetSlot -= 1;
    garage.fleetSlotLevel -= 1;
    
    let newFleetOpCost = 0;
    if (garage.fleetSlot > 1) {
      for (let i = 2; i <= garage.fleetSlot; i++) {
        const tier = Math.floor((i - 1) / 3);
        newFleetOpCost += 250 + (tier * 250);
      }
    }
    garage.fleet_operational_cost = newFleetOpCost;
    
    // Kalkulasi total (Fleet + Fuel)
    const fuelCost = garage.fuel_operational_cost || 0;
    garage.operational_cost = garage.fleet_operational_cost + fuelCost;
    
    await garage.save();

    return NextResponse.json({ 
      success: true, 
      message: `Garasi berhasil di-downgrade ke Slot ${garage.fleetSlot}`
    });

  } catch (error: any) {
    console.error("Downgrade Garage Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
