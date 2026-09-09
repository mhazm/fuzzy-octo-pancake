import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";
import FuelMarketListing from "@/lib/models/FuelMarketListing";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(request: Request) {
  let isListingCancelled = false;
  let targetListingId: string | null = null;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
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

    if (userGarage.status === "suspended") {
      return NextResponse.json({ error: "Akses ditolak! Garasi Anda sedang dibekukan (disita) karena tunggakan biaya operasional." }, { status: 403 });
    }

    const currentCapacity = userGarage.fuelCapacity || 2000;
    const currentStock = userGarage.fuelStock || 0;

    if (currentStock + listing.amount > currentCapacity) {
      return NextResponse.json({ 
        error: `Gagal menarik BBM! Kapasitas tangki garasi Anda (${currentCapacity.toLocaleString("id-ID")} L) tidak mencukupi untuk menampung kembali ${listing.amount.toLocaleString("id-ID")} L BBM (Stok saat ini: ${Math.floor(currentStock).toLocaleString("id-ID")} L). Silakan upgrade tangki garasi Anda terlebih dahulu.` 
      }, { status: 400 });
    }

    // Ubah status listing secara atomik untuk mencegah race condition
    targetListingId = listing._id.toString();
    const listingUpdate = await FuelMarketListing.updateOne(
      { _id: listing._id, status: "active", sellerDiscordId: discordId },
      { $set: { status: "cancelled" } }
    );

    if (listingUpdate.modifiedCount === 0) {
      return NextResponse.json({ error: "Listing ini sudah tidak aktif (mungkin sudah terjual)" }, { status: 400 });
    }

    isListingCancelled = true;

    // Kembalikan BBM ke Garasi (dari Listed ke Stock)
    await db.collection("garages").updateOne(
      { discordId },
      { $inc: { fuelStock: listing.amount, fuelListed: -listing.amount } }
    );

    // Revalidasi cache
    try {
      revalidatePath("/fuel-market");
      revalidatePath("/dashboard/garage");
    } catch (e) {
      console.error("Failed to revalidate fuel market paths:", e);
    }

    return NextResponse.json({ 
      success: true, 
      message: "BBM berhasil ditarik dan dikembalikan ke garasi Anda!" 
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });

  } catch (error: any) {
    console.error("Error cancelling P2P fuel listing:", error);

    // 🛡️ Rollback status listing jika gagal mengembalikan BBM ke garasi
    if (isListingCancelled && targetListingId) {
      try {
        await FuelMarketListing.updateOne(
          { _id: targetListingId, status: "cancelled" },
          { $set: { status: "active" } }
        );
      } catch (rollbackErr) {
        console.error("Critical Rollback Error in P2P Cancel:", rollbackErr);
      }
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
