import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";
import FuelMarketListing from "@/lib/models/FuelMarketListing";
import FuelTransaction from "@/lib/models/FuelTransaction";
import User from "@/lib/models/User";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = await request.json();
    if (!listingId) {
      return NextResponse.json({ error: "Listing ID diperlukan" }, { status: 400 });
    }

    const buyerDiscordId = session.user.discordId;

    await dbConnect();
    
    // Force initialize User model to prevent MissingSchemaError
    User.init();
    
    // Find Listing and populate seller details
    const listing = await FuelMarketListing.findById(listingId).populate("sellerId", "name discordId");
    if (!listing) {
      return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
    }
    
    if (listing.status !== "active") {
      return NextResponse.json({ error: "Listing BBM ini sudah terjual atau ditarik" }, { status: 400 });
    }

    if (listing.sellerDiscordId === buyerDiscordId) {
      return NextResponse.json({ error: "Anda tidak bisa membeli jualan Anda sendiri" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const GUILD_ID = process.env.GUILD_ID || "863959415702028318";

    // Kalkulasi Biaya (Harga + 5% Fee)
    const baseCost = listing.amount * listing.pricePerLiter;
    const totalCost = baseCost * 1.05; // Fee 5% dibebankan ke pembeli
    const roundedCost = Math.ceil(totalCost); // Bulatkan ke atas agar tidak ada desimal ribet

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
    
    if (buyerStock + listing.amount > buyerCapacity) {
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
      { $inc: { fuelStock: listing.amount } }
    );

    // 3. Tambah saldo penjual (hanya base cost, fee dihanguskan)
    await db.collection("currencies").updateOne(
      { userId: listing.sellerDiscordId, guildId: GUILD_ID },
      { $inc: { totalNC: baseCost } }
    );

    // 4. Ubah status listing
    listing.status = "sold";
    await listing.save();

    // Catat histori pembeli
    await db.collection("currencyhistories").insertOne({
      userId: buyerDiscordId,
      guildId: GUILD_ID,
      amount: roundedCost,
      type: "spend",
      reason: `Beli BBM dari driver via P2P Market (${listing.amount}L)`,
      createdAt: new Date(),
    });

    // Catat histori penjual
    await db.collection("currencyhistories").insertOne({
      userId: listing.sellerDiscordId,
      guildId: GUILD_ID,
      amount: baseCost,
      type: "earn",
      reason: `Penjualan BBM via P2P Market (${listing.amount}L)`,
      createdAt: new Date(),
    });

    // Catat Fuel Transaction
    const fuelTx = new FuelTransaction({
      type: "p2p",
      buyerDiscordId,
      buyerName: session.user.name || "Anonim",
      sellerDiscordId: listing.sellerDiscordId,
      sellerName: listing.sellerId?.name || "Anonim",
      amount: listing.amount,
      pricePerLiter: listing.pricePerLiter,
      totalPrice: roundedCost, // Buyer pays this
      fee: roundedCost - baseCost,
    });
    await fuelTx.save();

    return NextResponse.json({ success: true, message: "Pembelian BBM berhasil!" });

  } catch (error: any) {
    console.error("Error buying P2P fuel:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
