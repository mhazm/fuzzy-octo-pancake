import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Garage from "@/lib/models/Garage";
import mongoose from "mongoose";

import dbConnect from "@/lib/mongoose";
const OPERATIONAL_COST_PER_SLOT = 250;

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

    // Downgrade Garage
    garage.fleetSlot -= 1;
    garage.fleetSlotLevel -= 1;
    
    garage.fleet_operational_cost = garage.fleetSlot === 1 ? 0 : garage.fleetSlot * OPERATIONAL_COST_PER_SLOT;
    
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
