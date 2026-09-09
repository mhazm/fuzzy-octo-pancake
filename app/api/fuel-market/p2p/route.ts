import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";
import FuelMarketListing from "@/lib/models/FuelMarketListing";
import User from "@/lib/models/User";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
    
    const listings = await FuelMarketListing.find(query).sort({ pricePerLiter: 1, createdAt: -1 }).populate("sellerId", "name discordId image nismaraplus isBooster discordRole topManager").lean();

    return NextResponse.json({ success: true, listings }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
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
  let isFuelListed = false;
  let sellerDiscordId: string | null = null;
  let listedAmount = 0;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const amount = Math.floor(Number(body.amount));
    const pricePerLiter = Number(body.pricePerLiter);

    if (!amount || amount <= 0 || !Number.isFinite(amount) || !pricePerLiter || pricePerLiter <= 0 || !Number.isFinite(pricePerLiter)) {
      return NextResponse.json({ error: "Jumlah BBM (Liter) harus berupa bilangan bulat dan harga harus lebih besar dari 0" }, { status: 400 });
    }

    if (pricePerLiter > 1.5) {
      return NextResponse.json({ error: "Harga jual maksimal adalah 1.5 NC per liter" }, { status: 400 });
    }

    const discordId = String(session.user.discordId);
    sellerDiscordId = discordId;
    listedAmount = amount;

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

    if (userGarage.status === "suspended") {
      return NextResponse.json({ error: "Akses ditolak! Garasi Anda sedang dibekukan (disita) karena tunggakan biaya operasional." }, { status: 403 });
    }

    const currentFuelStock = userGarage.fuelStock || 0;
    if (currentFuelStock < amount) {
      return NextResponse.json({ error: "Stock BBM di tangki Anda tidak mencukupi" }, { status: 400 });
    }

    // Potong BBM dari tangki aktif secara atomik, pindahkan ke status Listed
    const garageUpdate = await db.collection("garages").updateOne(
      { discordId, fuelStock: { $gte: amount } },
      { $inc: { fuelStock: -amount, fuelListed: amount } }
    );

    if (garageUpdate.modifiedCount === 0) {
      return NextResponse.json({ error: "Stock BBM di tangki Anda tidak mencukupi" }, { status: 400 });
    }

    isFuelListed = true;

    // Buat Listing
    await dbConnect();
    const newListing = new FuelMarketListing({
      sellerId: userDoc._id.toString(),
      sellerDiscordId: discordId,
      amount,
      pricePerLiter,
    });
    await newListing.save();

    // Revalidasi cache
    try {
      revalidatePath("/fuel-market");
      revalidatePath("/dashboard/garage");
    } catch (e) {
      console.error("Failed to revalidate fuel market paths:", e);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Listing BBM berhasil dibuat" 
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      }
    });

  } catch (error: any) {
    console.error("Error creating P2P listing:", error);

    // 🛡️ Rollback jika fuelStock sudah dipotong tapi listing gagal dibuat
    if (isFuelListed && sellerDiscordId && listedAmount > 0) {
      try {
        const client = await clientPromise;
        const db = client.db();
        await db.collection("garages").updateOne(
          { discordId: sellerDiscordId },
          { $inc: { fuelStock: listedAmount, fuelListed: -listedAmount } }
        );
      } catch (rollbackErr) {
        console.error("Critical Rollback Error in P2P Listing:", rollbackErr);
      }
    }

    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
