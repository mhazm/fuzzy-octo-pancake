import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";
import FuelPrice from "@/lib/models/FuelPrice";
import FuelTransaction from "@/lib/models/FuelTransaction";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  let isBuyerNCDeducted = false;
  let isBuyerFuelAdded = false;
  let roundedCost = 0;
  let buyerDiscordId: string | null = null;
  let fuelAmount = 0;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = Math.floor(Number(body.amount));
    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
      return NextResponse.json({ error: "Jumlah BBM (Liter) tidak valid dan harus berupa bilangan bulat lebih dari 0" }, { status: 400 });
    }

    buyerDiscordId = String(session.user.discordId);
    fuelAmount = amount;

    await dbConnect();
    
    // Dapatkan harga saat ini
    const currentPriceData = await FuelPrice.findOne().sort({ timestamp: -1 });
    if (!currentPriceData) {
      return NextResponse.json({ error: "Data harga sistem tidak tersedia" }, { status: 400 });
    }

    const pricePerLiter = currentPriceData.price;

    const client = await clientPromise;
    const db = client.db();

    const GUILD_ID = process.env.GUILD_ID || "863959415702028318";

    // Kalkulasi Biaya (Harga + 5% Fee)
    const baseCost = amount * pricePerLiter;
    const totalCost = baseCost * 1.05; // Fee 5% dibebankan ke pembeli
    roundedCost = Math.ceil(totalCost); 

    // Cek Pembeli
    const buyerCurrency = await db.collection("currencies").findOne({ userId: buyerDiscordId, guildId: GUILD_ID });
    if (!buyerCurrency || buyerCurrency.totalNC < roundedCost) {
      return NextResponse.json({ error: "Saldo NC Anda tidak mencukupi" }, { status: 400 });
    }

    const buyerGarage = await db.collection("garages").findOne({ discordId: buyerDiscordId });
    if (!buyerGarage) {
      return NextResponse.json({ error: "Anda harus memiliki Garasi terlebih dahulu" }, { status: 404 });
    }

    if (buyerGarage.status === "suspended") {
      return NextResponse.json({ error: "Akses ditolak! Garasi Anda sedang dibekukan (disita) karena tunggakan biaya operasional." }, { status: 403 });
    }

    const buyerCapacity = buyerGarage.fuelCapacity || 2000;
    const buyerPhysicalFuel = (buyerGarage.fuelStock || 0) + (buyerGarage.fuelListed || 0);
    
    if (buyerPhysicalFuel + amount > buyerCapacity) {
      const remainingSpace = Math.max(0, buyerCapacity - buyerPhysicalFuel);
      return NextResponse.json({ 
        error: `Kapasitas tangki Anda tidak muat. (Sisa kapasitas: ${remainingSpace.toLocaleString("id-ID")} L)` 
      }, { status: 400 });
    }

    // Eksekusi Transaksi
    // 1. Potong saldo pembeli secara atomik untuk mencegah race condition
    const updateResult = await db.collection("currencies").updateOne(
      { userId: buyerDiscordId, guildId: GUILD_ID, totalNC: { $gte: roundedCost } },
      { $inc: { totalNC: -roundedCost } }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ error: "Transaksi gagal, saldo NC Anda tidak mencukupi." }, { status: 400 });
    }

    isBuyerNCDeducted = true;

    // 2. Tambah BBM ke pembeli dengan pengaman kapasitas atomik
    const garageUpdateResult = await db.collection("garages").updateOne(
      {
        discordId: buyerDiscordId,
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ["$fuelStock", 0] }, { $ifNull: ["$fuelListed", 0] }, amount] },
            { $ifNull: ["$fuelCapacity", 2000] }
          ]
        }
      },
      { $inc: { fuelStock: amount } }
    );

    if (garageUpdateResult.modifiedCount === 0) {
      // Rollback saldo pembeli jika kapasitas tangki penuh
      await db.collection("currencies").updateOne(
        { userId: buyerDiscordId, guildId: GUILD_ID },
        { $inc: { totalNC: roundedCost } }
      );
      isBuyerNCDeducted = false;
      return NextResponse.json({ error: "Kapasitas tangki Anda tidak muat atau telah penuh." }, { status: 400 });
    }

    isBuyerFuelAdded = true;

    // 3. Catat histori pembeli (Currency)
    await db.collection("currencyhistories").insertOne({
      userId: buyerDiscordId,
      guildId: GUILD_ID,
      amount: roundedCost,
      type: "spend",
      reason: `Beli BBM dari Sistem Market (${amount}L @ ${pricePerLiter} NC)`,
      createdAt: new Date(),
    });

    // 4. Catat Fuel Transaction
    const fuelTx = new FuelTransaction({
      type: "system",
      buyerDiscordId,
      buyerName: session.user.name || "Anonim",
      sellerDiscordId: null,
      sellerName: "Sistem",
      amount,
      pricePerLiter,
      totalPrice: roundedCost,
      fee: roundedCost - baseCost,
    });
    await fuelTx.save();

    // Revalidasi cache
    try {
      revalidatePath("/fuel-market");
      revalidatePath("/dashboard/garage");
      revalidatePath("/dashboard/currency");
    } catch (e) {
      console.error("Failed to revalidate fuel market paths:", e);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Pembelian BBM dari sistem berhasil!" 
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });

  } catch (error: any) {
    console.error("Error buying fuel from system:", error);

    // 🛡️ Comprehensive Rollback
    try {
      const client = await clientPromise;
      const db = client.db();
      const GUILD_ID = process.env.GUILD_ID || "863959415702028318";

      if (isBuyerNCDeducted && buyerDiscordId && roundedCost > 0) {
        await db.collection("currencies").updateOne(
          { userId: buyerDiscordId, guildId: GUILD_ID },
          { $inc: { totalNC: roundedCost } }
        );
      }

      if (isBuyerFuelAdded && buyerDiscordId && fuelAmount > 0) {
        await db.collection("garages").updateOne(
          { discordId: buyerDiscordId },
          { $inc: { fuelStock: -fuelAmount } }
        );
      }
    } catch (rollbackErr) {
      console.error("Critical Rollback Error in System Fuel Buy:", rollbackErr);
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
