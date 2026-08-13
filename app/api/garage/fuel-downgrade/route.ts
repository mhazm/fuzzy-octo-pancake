import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

const CAPACITY_DECREASE = 1000;
const OP_COST_DECREASE = 200;
const MIN_CAPACITY = 2000;
const MIN_LEVEL = 1;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;

    const client = await clientPromise;
    const db = client.db();

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

    const newCapacity = currentCapacity - CAPACITY_DECREASE;

    // Cegah downgrade jika stok melebihi kapasitas baru
    if (currentStock > newCapacity) {
      return NextResponse.json({ error: `Downgrade gagal! Anda memiliki ${currentStock} L bensin, sedangkan kapasitas baru hanya ${newCapacity} L. Jual bensin Anda terlebih dahulu.` }, { status: 400 });
    }

    const currentFuelOpCost = userGarage.fuel_operational_cost || 0;
    const currentFleetOpCost = userGarage.fleet_operational_cost || 0;
    
    // Pastikan operasional cost tidak minus
    const newFuelOpCost = Math.max(0, currentFuelOpCost - OP_COST_DECREASE);
    const newTotalOpCost = newFuelOpCost + currentFleetOpCost;

    // Downgrade Tangki
    await db.collection("garages").updateOne(
      { discordId },
      { 
        $set: {
          fuelCapacity: newCapacity,
          fuelTankLevel: currentLevel - 1,
          fuel_operational_cost: newFuelOpCost,
          operational_cost: newTotalOpCost,
        }
      }
    );

    return NextResponse.json({ success: true, message: "Fuel tank berhasil di-downgrade" });

  } catch (error: any) {
    console.error("Error downgrading fuel tank:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
