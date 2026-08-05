import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";
import FuelPrice from "@/lib/models/FuelPrice";
import FuelTransaction from "@/lib/models/FuelTransaction";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await request.json();
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount diperlukan dan harus lebih dari 0" }, { status: 400 });
    }

    const buyerDiscordId = session.user.discordId;

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
    const roundedCost = Math.ceil(totalCost); 

    // Cek Pembeli
    const buyerCurrency = await db.collection("currencies").findOne({ userId: buyerDiscordId, guildId: GUILD_ID });
    if (!buyerCurrency || buyerCurrency.totalNC < roundedCost) {
      return NextResponse.json({ error: "Saldo NC Anda tidak mencukupi" }, { status: 400 });
    }

    const buyerGarage = await db.collection("garages").findOne({ discordId: buyerDiscordId });
    if (!buyerGarage) {
      return NextResponse.json({ error: "Anda harus memiliki Garasi terlebih dahulu" }, { status: 404 });
    }

    const buyerCapacity = buyerGarage.fuelCapacity || 2000;
    const buyerStock = buyerGarage.fuelStock || 0;
    
    if (buyerStock + amount > buyerCapacity) {
      return NextResponse.json({ error: `Kapasitas tangki Anda tidak muat. (Sisa kapasitas: ${buyerCapacity - buyerStock} L)` }, { status: 400 });
    }

    // Eksekusi Transaksi
    // 1. Potong saldo pembeli
    await db.collection("currencies").updateOne(
      { userId: buyerDiscordId, guildId: GUILD_ID },
      { $inc: { totalNC: -roundedCost } }
    );

    // 2. Tambah BBM ke pembeli
    await db.collection("garages").updateOne(
      { discordId: buyerDiscordId },
      { $inc: { fuelStock: amount } }
    );

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

    return NextResponse.json({ success: true, message: "Pembelian BBM dari sistem berhasil!" });

  } catch (error: any) {
    console.error("Error buying fuel from system:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
