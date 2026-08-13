import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Garage from "@/lib/models/Garage";
import { getMechanicConfig, generateMechanicName, MechanicSpecialty } from "@/lib/constants/mechanics";
import mongoose from "mongoose";
import { checkRateLimit } from "@/lib/rateLimit";

import dbConnect from "@/lib/mongoose";
const GUILD_ID = "863959415702028318";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;
    if (!checkRateLimit(discordId, "mechanics-hire", 1000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Mohon tunggu sesaat." }, { status: 429 });
    }


    const { specialty, level } = await request.json();

    if (!["umum", "ban", "mesin"].includes(specialty)) {
      return NextResponse.json({ error: "Invalid specialty" }, { status: 400 });
    }

    const config = getMechanicConfig(level);
    if (!config) {
      return NextResponse.json({ error: "Invalid level" }, { status: 400 });
    }

    await dbConnect();

    const client = await clientPromise;
    const db = client.db();

    // Find the user's garage
    const garage = await Garage.findOne({ discordId: session.user.discordId });
    if (!garage) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }

    // Check if the user already has a mechanic of this specialty
    if (garage.mechanics && garage.mechanics[specialty as MechanicSpecialty]?.name) {
      return NextResponse.json({ error: `Anda sudah memiliki mekanik untuk tipe ${specialty}` }, { status: 400 });
    }

    // Check balance
    const currencyData = await db.collection("currencies").findOne({ userId: session.user.discordId, guildId: GUILD_ID });
    if (!currencyData || currencyData.totalNC < config.salary) {
      return NextResponse.json({ error: "Saldo NC tidak mencukupi untuk biaya sewa awal" }, { status: 400 });
    }

    // Generate random name
    const mechanicName = generateMechanicName();
    const extendAt = new Date();
    extendAt.setDate(extendAt.getDate() + 7); // Extend in 7 days

    // Deduct salary atomically
    const deductRes = await db.collection("currencies").updateOne(
      { userId: session.user.discordId, guildId: GUILD_ID, totalNC: { $gte: config.salary } },
      { $inc: { totalNC: -config.salary } }
    );

    if (deductRes.modifiedCount === 0) {
      return NextResponse.json({ error: "Gagal memotong saldo NC (mungkin saldo tidak cukup)" }, { status: 400 });
    }

    await db.collection("currencyhistories").insertOne({
      userId: session.user.discordId,
      guildId: GUILD_ID,
      amount: config.salary,
      type: "spend",
      reason: `Hire Mechanic ${mechanicName} (${specialty} Lv.${level})`,
      createdAt: new Date(),
    });

    // Update Garage
    if (!garage.mechanics) {
      garage.mechanics = {};
    }
    garage.mechanics[specialty as MechanicSpecialty] = {
      name: mechanicName,
      level: config.level,
      boostPercentage: config.boostPercentage,
      salary: config.salary,
      extendAt: extendAt,
    };
    await garage.save();

    return NextResponse.json({ 
      success: true, 
      message: `Berhasil menyewa Mekanik ${mechanicName} (Spesialis ${specialty})`,
      mechanic: garage.mechanics[specialty as MechanicSpecialty]
    });

  } catch (error: any) {
    console.error("Hire Mechanic Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
