import { NextResponse } from "next/server";
import mongoose from "mongoose";
import MarketItem from "@/lib/models/MarketItem";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

import dbConnect from "@/lib/mongoose";
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

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET MyItems Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dagangan" },
      { status: 500 },
    );
  }
}
