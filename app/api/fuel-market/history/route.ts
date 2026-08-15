import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongoose";
import FuelTransaction from "@/lib/models/FuelTransaction";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    
    const discordId = session.user.discordId;

    await dbConnect();
    
    // Cari transaksi dimana user bertindak sebagai pembeli ATAU penjual
    const query = {
      $or: [
        { buyerDiscordId: discordId },
        { sellerDiscordId: discordId }
      ]
    };

    const total = await FuelTransaction.countDocuments(query);
    const history = await FuelTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({ 
      success: true, 
      history,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, s-maxage=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    console.error("Error fetching fuel market history:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
