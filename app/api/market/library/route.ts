import { NextResponse } from "next/server";
import mongoose from "mongoose";
import MarketPurchase from "@/lib/models/MarketPurchase";
import "@/lib/models/MarketItem"; // Pastikan model ter-register sebelum populate
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    await dbConnect();

    // Ambil data pembelian dengan populasi marketItem
    const purchases = await MarketPurchase.find({ buyerId: String(session.user.discordId) })
      .populate("marketItemId")
      .sort({ purchasedAt: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(purchases, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET MarketLibrary Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data library" },
      { status: 500 },
    );
  }
}
