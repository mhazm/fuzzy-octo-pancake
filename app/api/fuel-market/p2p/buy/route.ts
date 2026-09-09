import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";
import FuelMarketListing from "@/lib/models/FuelMarketListing";
import FuelTransaction from "@/lib/models/FuelTransaction";
import User from "@/lib/models/User";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  let isListingLocked = false;
  let isBuyerNCDeducted = false;
  let isBuyerFuelAdded = false;
  let roundedCost = 0;
  let listingAmount = 0;
  let buyerDiscordId: string | null = null;
  let listingId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    listingId = body.listingId;
    if (!listingId) {
      return NextResponse.json({ error: "Listing ID diperlukan" }, { status: 400 });
    }

    buyerDiscordId = String(session.user.discordId);

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
    roundedCost = Math.ceil(totalCost); // Bulatkan ke atas agar tidak ada desimal
    listingAmount = listing.amount;

    // Cek Saldo Pembeli Awal
    const buyerCurrency = await db.collection("currencies").findOne({ userId: buyerDiscordId, guildId: GUILD_ID });
    if (!buyerCurrency || buyerCurrency.totalNC < roundedCost) {
      return NextResponse.json({ error: "Saldo NC Anda tidak mencukupi" }, { status: 400 });
    }

    // Cek Garasi Pembeli
    const buyerGarage = await db.collection("garages").findOne({ discordId: buyerDiscordId });
    if (!buyerGarage) {
      return NextResponse.json({ error: "Anda harus memiliki Garasi terlebih dahulu" }, { status: 404 });
    }

    if (buyerGarage.status === "suspended") {
      return NextResponse.json({ error: "Akses ditolak! Garasi Anda sedang dibekukan (disita) karena tunggakan biaya operasional." }, { status: 403 });
    }

    // Cek Garasi Penjual
    const sellerGarage = await db.collection("garages").findOne({ discordId: listing.sellerDiscordId });
    if (sellerGarage?.status === "suspended") {
      return NextResponse.json({ error: "Transaksi gagal. Garasi penjual sedang dibekukan karena tunggakan biaya operasional." }, { status: 400 });
    }

    const buyerCapacity = buyerGarage.fuelCapacity || 2000;
    const buyerPhysicalFuel = (buyerGarage.fuelStock || 0) + (buyerGarage.fuelListed || 0);
    
    if (buyerPhysicalFuel + listing.amount > buyerCapacity) {
      const remainingSpace = Math.max(0, buyerCapacity - buyerPhysicalFuel);
      return NextResponse.json({ 
        error: `Kapasitas tangki Anda tidak muat. (Sisa kapasitas: ${remainingSpace.toLocaleString("id-ID")} L)` 
      }, { status: 400 });
    }

    // ==========================================
    // 🛡️ STEP 1: ATOMIC STATE LOCK (GATE PERTAMA)
    // Kunci status listing menjadi "sold" sebelum menyentuh saldo uang atau tangki!
    // ==========================================
    const lockResult = await FuelMarketListing.updateOne(
      { _id: listing._id, status: "active" },
      { $set: { status: "sold" } }
    );

    if (lockResult.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Listing BBM ini sudah keduluan terjual atau ditarik oleh penjual." },
        { status: 400 }
      );
    }

    isListingLocked = true;

    // ==========================================
    // 🛡️ STEP 2: ATOMIC NC DEDUCTION
    // ==========================================
    const buyerCurrencyUpdate = await db.collection("currencies").updateOne(
      { userId: buyerDiscordId, guildId: GUILD_ID, totalNC: { $gte: roundedCost } },
      { $inc: { totalNC: -roundedCost } }
    );

    if (buyerCurrencyUpdate.modifiedCount === 0) {
      // Buka kembali lock listing jika saldo pembeli ternyata kurang
      await FuelMarketListing.updateOne({ _id: listing._id, status: "sold" }, { $set: { status: "active" } });
      isListingLocked = false;
      return NextResponse.json({ error: "Saldo NC Anda tidak mencukupi saat proses transaksi." }, { status: 400 });
    }

    isBuyerNCDeducted = true;

    // ==========================================
    // 🛡️ STEP 3: ATOMIC TANK INJECTION WITH CAPACITY CHECK
    // ==========================================
    const garageUpdateResult = await db.collection("garages").updateOne(
      {
        discordId: buyerDiscordId,
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ["$fuelStock", 0] }, { $ifNull: ["$fuelListed", 0] }, listing.amount] },
            { $ifNull: ["$fuelCapacity", 2000] }
          ]
        }
      },
      { $inc: { fuelStock: listing.amount } }
    );

    if (garageUpdateResult.modifiedCount === 0) {
      // Rollback saldo pembeli dan listing jika tangki gagal muat
      await db.collection("currencies").updateOne(
        { userId: buyerDiscordId, guildId: GUILD_ID },
        { $inc: { totalNC: roundedCost } }
      );
      isBuyerNCDeducted = false;

      await FuelMarketListing.updateOne({ _id: listing._id, status: "sold" }, { $set: { status: "active" } });
      isListingLocked = false;

      return NextResponse.json({ error: "Kapasitas tangki Anda tidak muat atau telah penuh." }, { status: 400 });
    }

    isBuyerFuelAdded = true;

    // ==========================================
    // 🛡️ STEP 4: SELLER SETTLEMENT & TRANSACTION LOGGING
    // ==========================================
    // Tambah saldo penjual (hanya base cost, fee dihanguskan)
    await db.collection("currencies").updateOne(
      { userId: listing.sellerDiscordId, guildId: GUILD_ID },
      { $inc: { totalNC: baseCost } },
      { upsert: true }
    );

    // Kurangi status Listed dari garasi penjual karena sudah laku
    await db.collection("garages").updateOne(
      { discordId: listing.sellerDiscordId },
      { $inc: { fuelListed: -listing.amount } }
    );

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
      message: "Pembelian BBM berhasil!" 
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });

  } catch (error: any) {
    console.error("Critical Error buying P2P fuel:", error);

    // 🛡️ COMPREHENSIVE ROLLBACK
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

      if (isBuyerFuelAdded && buyerDiscordId && listingAmount > 0) {
        await db.collection("garages").updateOne(
          { discordId: buyerDiscordId },
          { $inc: { fuelStock: -listingAmount } }
        );
      }

      if (isListingLocked && listingId) {
        await FuelMarketListing.updateOne(
          { _id: listingId, status: "sold" },
          { $set: { status: "active" } }
        );
      }
    } catch (rollbackErr) {
      console.error("Critical P2P Buy Rollback Error:", rollbackErr);
    }

    return NextResponse.json({ error: "Terjadi kesalahan internal saat memproses transaksi BBM." }, { status: 500 });
  }
}
