import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

const UPGRADE_COST = 500;
const CAPACITY_INCREASE = 1000;
const OP_COST_INCREASE = 200;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;

    const client = await clientPromise;
    const db = client.db();

    const body = await request.json().catch(() => ({}));
    const multiplier = Math.max(1, parseInt(body.multiplier) || 1);
    const totalCost = UPGRADE_COST * multiplier;

    const GUILD_ID = process.env.GUILD_ID || "863959415702028318";

    // Dapatkan data mata uang user
    const userCurrency = await db.collection("currencies").findOne({ userId: discordId, guildId: GUILD_ID });
    if (!userCurrency || userCurrency.totalNC < totalCost) {
      return NextResponse.json({ error: `Saldo NC tidak mencukupi. Butuh ${totalCost} NC.` }, { status: 400 });
    }

    // Cek apakah user punya Garasi
    const userGarage = await db.collection("garages").findOne({ discordId });
    if (!userGarage) {
      return NextResponse.json({ error: "Garasi tidak ditemukan" }, { status: 404 });
    }

    // Transaksi potongan NC
    await db.collection("currencies").updateOne(
      { userId: discordId, guildId: GUILD_ID },
      { $inc: { totalNC: -totalCost } }
    );

    const currentCapacity = userGarage.fuelCapacity || 2000;
    const currentLevel = userGarage.fuelTankLevel || 1;
    const currentFuelOpCost = userGarage.fuel_operational_cost || 0;
    const currentFleetOpCost = userGarage.fleet_operational_cost || 0;
    
    const newCapacity = currentCapacity + (CAPACITY_INCREASE * multiplier);
    const newLevel = currentLevel + multiplier;
    
    // Hitung total penambahan biaya operasional berdasarkan tier (naik 100 tiap 5 level)
    let totalOpCostIncrease = 0;
    for (let i = currentLevel + 1; i <= newLevel; i++) {
      const tier = Math.floor((i - 1) / 5);
      totalOpCostIncrease += (200 + (tier * 100));
    }

    const newFuelOpCost = currentFuelOpCost + totalOpCostIncrease;
    const newTotalOpCost = newFuelOpCost + currentFleetOpCost;

    // Catat riwayat
    await db.collection("currencyhistories").insertOne({
      userId: discordId,
      guildId: GUILD_ID,
      amount: totalCost,
      type: "spend",
      reason: `Upgrade Fuel Tank ke Level ${newLevel} (+${multiplier} Level)`,
      createdAt: new Date(),
    });

    // Upgrade Tangki
    await db.collection("garages").updateOne(
      { discordId },
      { 
        $set: {
          fuelCapacity: newCapacity,
          fuelTankLevel: newLevel,
          fuel_operational_cost: newFuelOpCost,
          operational_cost: newTotalOpCost,
        }
      }
    );

    return NextResponse.json({ success: true, message: `Fuel tank berhasil di-upgrade ke Level ${newLevel}` });

  } catch (error: any) {
    console.error("Error upgrading fuel tank:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
