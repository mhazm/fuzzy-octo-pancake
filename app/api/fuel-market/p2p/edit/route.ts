import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import FuelMarketListing from "@/lib/models/FuelMarketListing";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId, newPrice } = await request.json();
    if (!listingId || !newPrice || Number(newPrice) <= 0) {
      return NextResponse.json({ error: "Listing ID dan Harga Baru (lebih dari 0) diperlukan" }, { status: 400 });
    }

    if (Number(newPrice) > 1.5) {
      return NextResponse.json({ error: "Harga jual maksimal adalah 1.5 NC per liter" }, { status: 400 });
    }

    const discordId = session.user.discordId;

    await dbConnect();
    
    const listing = await FuelMarketListing.findById(listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing tidak ditemukan" }, { status: 404 });
    }
    
    if (listing.sellerDiscordId !== discordId) {
      return NextResponse.json({ error: "Anda tidak berhak mengubah jualan ini" }, { status: 403 });
    }

    if (listing.status !== "active") {
      return NextResponse.json({ error: "Listing ini sudah tidak aktif (mungkin sudah terjual)" }, { status: 400 });
    }

    // Ubah harga (updatedAt akan ter-update otomatis oleh Mongoose karena timestamps: true)
    listing.pricePerLiter = Number(newPrice);
    await listing.save();

    return NextResponse.json({ success: true, message: "Harga jualan BBM berhasil diperbarui!" });

  } catch (error: any) {
    console.error("Error editing P2P fuel listing:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
