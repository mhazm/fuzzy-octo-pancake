import { NextResponse } from "next/server";
import mongoose from "mongoose";
import MarketItem from "@/lib/models/MarketItem";
import MarketPurchase from "@/lib/models/MarketPurchase";
import Transaction from "@/lib/models/Transaction";
import "@/lib/models/User";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "../../../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rateLimit";
import { logExtremeActivity } from "@/lib/securityLogger";
import { revalidatePath } from "next/cache";

import dbConnect from "@/lib/mongoose";
const GUILD_ID = process.env.DISCORD_GUILD_ID || "863959415702028318";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: itemId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }
    const buyerId = session.user.discordId as string;

    if (!checkRateLimit(buyerId, "market-buy", 1000)) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Mohon tunggu sesaat." }, { status: 429 });
    }


    await dbConnect();

    const query = mongoose.isValidObjectId(itemId) 
      ? { $or: [{ slug: itemId }, { _id: itemId }] }
      : { slug: itemId };
    const item = await MarketItem.findOne(query);
    if (!item || !item.isPublished) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan atau tidak tersedia" },
        { status: 404 },
      );
    }

    if (item.sellerId === buyerId) {
      return NextResponse.json(
        { error: "Anda tidak bisa membeli barang Anda sendiri" },
        { status: 400 },
      );
    }

    const existingPurchase = await MarketPurchase.findOne({
      buyerId,
      marketItemId: item._id, // Gunakan _id asli dari document
    });
    if (existingPurchase) {
      return NextResponse.json(
        { error: "Anda sudah memiliki barang ini" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const price = Number(item.price);

    // Proses pembayaran jika harganya lebih dari 0
    if (price > 0) {
      const buyerCurrency = await db.collection("currencies").findOne({
        userId: buyerId,
        guildId: GUILD_ID,
      });

      if (!buyerCurrency || buyerCurrency.totalNC < price) {
        return NextResponse.json(
          { error: "Saldo Nismara Coin tidak mencukupi" },
          { status: 400 },
        );
      }

      // Potong NC pembeli
      const deductRes = await db.collection("currencies").updateOne(
        { userId: buyerId, guildId: GUILD_ID, totalNC: { $gte: price } },
        { $inc: { totalNC: -price } },
      );

      if (deductRes.modifiedCount === 0) {
        return NextResponse.json(
          { error: "Gagal memproses pembayaran (potong saldo)" },
          { status: 500 },
        );
      }

      // Hitung penerimaan penjual (dipotong 11% pajak, 5% admin -> total 16%)
      const feePercent = 0.16;
      const feeAmount = Math.round(price * feePercent);
      const sellerReceives = price - feeAmount;

      // Tambah NC penjual
      await db.collection("currencies").updateOne(
        { userId: item.sellerId, guildId: GUILD_ID },
        { $inc: { totalNC: sellerReceives } },
      );

      // Catat history pembeli (pengeluaran)
      await db.collection("currencyhistories").insertOne({
        userId: buyerId,
        guildId: GUILD_ID,
        amount: price,
        type: "spend",
        reason: `Membeli Mod Market: ${item.title}`,
        createdAt: new Date(),
      });

      const userObj = await mongoose.model("User").findOne({ discordId: buyerId });
      if (userObj) {
        await Transaction.create({
          trxId: `TRX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
          discordId: buyerId,
          userId: userObj._id,
          title: `Market: ${item.title}`,
          category: "market",
          amount: price,
          currency: "NC",
          status: "success",
          metadata: {
            itemId: item._id
          }
        });
      }

      // Catat history penjual (pemasukan bersih)
      await db.collection("currencyhistories").insertOne({
        userId: item.sellerId,
        guildId: GUILD_ID,
        amount: sellerReceives,
        type: "earn",
        reason: `Penjualan Mod Market: ${item.title} (Setelah pajak 16%)`,
        createdAt: new Date(),
      });

      // Log extreme purchases/sales
      await logExtremeActivity(buyerId, "MARKET_BUY", price, `Membeli mod market: ${item.title}`);
      await logExtremeActivity(item.sellerId, "MARKET_SELL", sellerReceives, `Menjual mod market: ${item.title}`);
    }

    // Buat riwayat pembelian
    const purchase = await MarketPurchase.create({
      buyerId,
      marketItemId: item._id,
      pricePaid: price,
    });

    try {
      revalidatePath("/dashboard/library");
      revalidatePath("/api/market/library");
      revalidatePath(`/market/${item.slug}`);
      revalidatePath(`/market/${item._id}`);
    } catch(e) {
      console.error("Failed to revalidate cache", e);
    }

    return NextResponse.json({
      success: true,
      message: "Berhasil membeli barang!",
      data: purchase,
    });
  } catch (error: any) {
    console.error("POST MarketBuy Error:", error);
    // Handle mongoose duplicate key error if somehow concurrent requests hit
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Anda sudah memiliki barang ini" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Gagal memproses pembelian" },
      { status: 500 },
    );
  }
}
