import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

const CAPACITY_DECREASE = 1000;
const MIN_CAPACITY = 2000;
const MIN_LEVEL = 1;
const DOWNGRADE_COST = 250;

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
    let multiplier = Math.max(1, parseInt(body.multiplier) || 1);
    
    const GUILD_ID = process.env.GUILD_ID || "863959415702028318";
    
    // Cek apakah user punya Garasi
    const userGarage = await db.collection("garages").findOne({ discordId });
    if (!userGarage) {
      return NextResponse.json({ error: "Garasi tidak ditemukan" }, { status: 404 });
    }

    const currentCapacity = userGarage.fuelCapacity || MIN_CAPACITY;
    const currentLevel = userGarage.fuelTankLevel || MIN_LEVEL;
    const currentStock = userGarage.fuelStock || 0;

    if (currentLevel <= MIN_LEVEL) {
      return NextResponse.json({ error: "Tangki sudah di level terendah" }, { status: 400 });
    }

    if (currentLevel - multiplier < MIN_LEVEL) {
      multiplier = currentLevel - MIN_LEVEL;
    }

    if (multiplier <= 0) {
      return NextResponse.json({ error: "Downgrade tidak valid" }, { status: 400 });
    }

    const totalCost = DOWNGRADE_COST * multiplier;

    // Cek saldo user
    const userCurrency = await db.collection("currencies").findOne({ userId: discordId, guildId: GUILD_ID });
    if (!userCurrency || userCurrency.totalNC < totalCost) {
      return NextResponse.json({ error: `Saldo NC tidak mencukupi. Butuh ${totalCost} NC untuk downgrade.` }, { status: 400 });
    }

    const newCapacity = currentCapacity - (CAPACITY_DECREASE * multiplier);

    // Cegah downgrade jika stok melebihi kapasitas baru
    if (currentStock > newCapacity) {
      return NextResponse.json({ error: `Downgrade gagal! Anda memiliki ${Math.floor(currentStock)} L bensin, sedangkan kapasitas baru hanya ${newCapacity} L. Jual bensin Anda terlebih dahulu.` }, { status: 400 });
    }

    const currentFuelOpCost = userGarage.fuel_operational_cost || 0;
    const currentFleetOpCost = userGarage.fleet_operational_cost || 0;
    const newLevel = currentLevel - multiplier;
    
    // Hitung total pengurangan biaya operasional berdasarkan tier
    let totalOpCostDecrease = 0;
    for (let i = currentLevel; i > newLevel; i--) {
      const tier = Math.floor((i - 1) / 5);
      totalOpCostDecrease += (200 + (tier * 100));
    }
    
    // Pastikan operasional cost tidak minus
    const newFuelOpCost = Math.max(0, currentFuelOpCost - totalOpCostDecrease);
    const newTotalOpCost = newFuelOpCost + currentFleetOpCost;

    // Transaksi potongan NC
    await db.collection("currencies").updateOne(
      { userId: discordId, guildId: GUILD_ID },
      { $inc: { totalNC: -totalCost } }
    );

    // Catat riwayat
    await db.collection("currencyhistories").insertOne({
      userId: discordId,
      guildId: GUILD_ID,
      amount: totalCost,
      type: "spend",
      reason: `Downgrade Fuel Tank ke Level ${newLevel} (-${multiplier} Level)`,
      createdAt: new Date(),
    });

    // Downgrade Tangki
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

    return NextResponse.json({ success: true, message: `Fuel tank berhasil di-downgrade ke Level ${newLevel}` });

  } catch (error: any) {
    console.error("Error downgrading fuel tank:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
