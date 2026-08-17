import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";
import FuelMarketListing from "@/lib/models/FuelMarketListing";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";


export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Force initialize User model to prevent MissingSchemaError
    User.init();
    
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get("sellerId");
    
    let query: any = { status: "active" };
    if (sellerId) {
      query.sellerId = sellerId;
    }
    
    const listings = await FuelMarketListing.find(query).sort({ pricePerLiter: 1, createdAt: -1 }).populate("sellerId", "name discordId image nismaraplus isBooster discordRole").lean();

    return NextResponse.json({ success: true, listings }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error("Error fetching P2P fuel listings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount, pricePerLiter } = await request.json();

    if (!amount || amount <= 0 || !pricePerLiter || pricePerLiter <= 0) {
      return NextResponse.json({ error: "Amount dan price harus lebih besar dari 0" }, { status: 400 });
    }

    if (pricePerLiter > 1.5) {
      return NextResponse.json({ error: "Harga jual maksimal adalah 1.5 NC per liter" }, { status: 400 });
    }

    const discordId = session.user.discordId;

    const client = await clientPromise;
    const db = client.db();

    // Pastikan user ada di db 'users'
    const userDoc = await db.collection("users").findOne({ discordId });
    if (!userDoc) {
       return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Cek Garasi dan fuelStock
    const userGarage = await db.collection("garages").findOne({ discordId });
    if (!userGarage) {
      return NextResponse.json({ error: "Garasi tidak ditemukan" }, { status: 404 });
    }

    const currentFuelStock = userGarage.fuelStock || 0;
    if (currentFuelStock < amount) {
      return NextResponse.json({ error: "Stock BBM di tangki Anda tidak mencukupi" }, { status: 400 });
    }

    // Potong BBM dari tangki aktif, pindahkan ke status Listed
    await db.collection("garages").updateOne(
      { discordId },
      { $inc: { fuelStock: -amount, fuelListed: amount } }
    );

    // Buat Listing
    await dbConnect();
    const newListing = new FuelMarketListing({
      sellerId: userDoc._id.toString(),
      sellerDiscordId: discordId,
      amount,
      pricePerLiter,
    });
    await newListing.save();

    return NextResponse.json({ success: true, message: "Listing BBM berhasil dibuat" });

  } catch (error: any) {
    console.error("Error creating P2P listing:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
