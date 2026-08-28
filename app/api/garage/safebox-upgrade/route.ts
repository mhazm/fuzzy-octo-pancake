import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

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

    const GUILD_ID = process.env.GUILD_ID || "863959415702028318";

    // Cek Garasi User
    const userGarage = await db.collection("garages").findOne({ discordId });
    if (!userGarage) {
      return NextResponse.json({ error: "Garasi tidak ditemukan" }, { status: 404 });
    }

    const currentLevel = userGarage.safeboxLevel || 1;
    const newLevel = currentLevel + multiplier;

    // Hitung total biaya upgrade
    let totalCost = 0;
    for (let i = currentLevel + 1; i <= newLevel; i++) {
      const tier = Math.floor((i - 2) / 3);
      totalCost += 1000 + Math.max(0, tier * 200);
    }

    // Hitung total tambahan biaya operasional bulanan
    let totalOpCostIncrease = 0;
    for (let i = currentLevel + 1; i <= newLevel; i++) {
      if (i <= 1) continue;
      const tier = Math.floor((i - 2) / 3);
      // Setiap naik 1 level, tidak berarti naik 150 secara akumulatif, 
      // tapi operasional bulanan adalah 250 + (tier * 150).
      // Untuk menghitung delta op_cost: 
      // Kita cukup hitung op_cost baru dikurangi op_cost lama di bawah.
    }

    // Formula total Op Cost untuk suatu level secara akumulatif:
    const calculateSafeboxOpCost = (level: number) => {
      let totalCost = 0;
      for (let i = 2; i <= level; i++) {
        const tier = Math.floor((i - 2) / 3);
        totalCost += 250 + (tier * 150);
      }
      return totalCost;
    };

    const currentSafeboxOpCost = calculateSafeboxOpCost(currentLevel);
    const newSafeboxOpCost = calculateSafeboxOpCost(newLevel);
    
    const deltaOpCost = newSafeboxOpCost - currentSafeboxOpCost;
    const currentTotalOpCost = userGarage.operational_cost || 0;
    const newTotalOpCost = currentTotalOpCost + deltaOpCost;

    // Cek saldo user
    const userCurrency = await db.collection("currencies").findOne({ userId: discordId, guildId: GUILD_ID });
    if (!userCurrency || userCurrency.totalNC < totalCost) {
      return NextResponse.json({ error: `Saldo NC tidak mencukupi. Butuh ${totalCost} NC.` }, { status: 400 });
    }

    // Transaksi pemotongan NC
    await db.collection("currencies").updateOne(
      { userId: discordId, guildId: GUILD_ID },
      { $inc: { totalNC: -totalCost } }
    );

    // Catat riwayat NC
    await db.collection("currencyhistories").insertOne({
      userId: discordId,
      guildId: GUILD_ID,
      amount: totalCost,
      type: "spend",
      reason: `Upgrade Safebox ke Level ${newLevel} (+${multiplier} Level)`,
      createdAt: new Date(),
    });

    // Upgrade Safebox di Garage
    await db.collection("garages").updateOne(
      { discordId },
      { 
        $set: {
          safeboxLevel: newLevel,
          safebox_operational_cost: newSafeboxOpCost,
          operational_cost: newTotalOpCost,
        }
      }
    );

    return NextResponse.json({ success: true, message: `Safebox berhasil di-upgrade ke Level ${newLevel}` });

  } catch (error: any) {
    console.error("Error upgrading safebox:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
