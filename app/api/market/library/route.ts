import { NextResponse } from "next/server";
import mongoose from "mongoose";
import MarketPurchase from "@/lib/models/MarketPurchase";
import "@/lib/models/MarketItem"; // Pastikan model ter-register sebelum populate
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    // Ambil data pembelian dengan populasi marketItem
    const purchases = await MarketPurchase.find({ buyerId: session.user.discordId })
      .populate("marketItemId")
      .sort({ purchasedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(purchases);
  } catch (error) {
    console.error("GET MarketLibrary Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data library" },
      { status: 500 },
    );
  }
}
