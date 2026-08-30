import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";
import FuelMarketListing from "@/lib/models/FuelMarketListing";

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

    const discordId = session.user.discordId;

    await dbConnect();
    
    const listing = await FuelMarketListing.findById(listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
    }
    
    if (listing.sellerDiscordId !== discordId) {
      return NextResponse.json({ error: "Anda tidak berhak menarik jualan ini" }, { status: 403 });
    }

    if (listing.status !== "active") {
      return NextResponse.json({ error: "Listing ini sudah tidak aktif (mungkin sudah terjual)" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Validasi kapasitas garasi sebelum dikembalikan ke stock
    const userGarage = await db.collection("garages").findOne({ discordId });
    if (!userGarage) {
      return NextResponse.json({ error: "Garasi tidak ditemukan" }, { status: 404 });
    }

    const currentCapacity = userGarage.fuelCapacity || 2000;
    const currentStock = userGarage.fuelStock || 0;

    if (currentStock + listing.amount > currentCapacity) {
      return NextResponse.json({ 
        error: `Gagal menarik BBM! Kapasitas tangki garasi Anda (${currentCapacity.toLocaleString("id-ID")} L) tidak mencukupi untuk menampung kembali ${listing.amount.toLocaleString("id-ID")} L BBM (Stok saat ini: ${Math.floor(currentStock).toLocaleString("id-ID")} L). Silakan upgrade tangki garasi Anda terlebih dahulu.` 
      }, { status: 400 });
    }

    // Ubah status listing secara atomik untuk mencegah race condition
    const listingUpdate = await FuelMarketListing.updateOne(
      { _id: listing._id, status: "active", sellerDiscordId: discordId },
      { $set: { status: "cancelled" } }
    );

    if (listingUpdate.modifiedCount === 0) {
      return NextResponse.json({ error: "Listing ini sudah tidak aktif (mungkin sudah terjual)" }, { status: 400 });
    }

    // Kembalikan BBM ke Garasi (dari Listed ke Stock)
    await db.collection("garages").updateOne(
      { discordId },
      { $inc: { fuelStock: listing.amount, fuelListed: -listing.amount } }
    );

    return NextResponse.json({ success: true, message: "BBM berhasil ditarik dan dikembalikan ke garasi Anda!" });

  } catch (error: any) {
    console.error("Error cancelling P2P fuel listing:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
