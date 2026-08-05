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

    // Kembalikan BBM ke Garasi
    await db.collection("garages").updateOne(
      { discordId },
      { $inc: { fuelStock: listing.amount } }
    );

    // Ubah status listing
    listing.status = "cancelled";
    await listing.save();

    return NextResponse.json({ success: true, message: "BBM berhasil ditarik dan dikembalikan ke garasi Anda!" });

  } catch (error: any) {
    console.error("Error cancelling P2P fuel listing:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
