import { NextResponse } from "next/server";
import mongoose from "mongoose";
import MarketItem from "@/lib/models/MarketItem";
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

    // Ambil data barang yang dijual oleh user
    const items = await MarketItem.find({ sellerId: String(session.user.discordId) })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET MyItems Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dagangan" },
      { status: 500 },
    );
  }
}
