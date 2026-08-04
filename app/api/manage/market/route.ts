import { NextResponse } from "next/server";
import mongoose from "mongoose";
import MarketItem from "@/lib/models/MarketItem";
import MarketPurchase from "@/lib/models/MarketPurchase";
import "@/lib/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "admin" && session.user.role !== "manager")) {
      return NextResponse.json({ error: "Forbidden - Manager only" }, { status: 403 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const query: any = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const itemsRaw = await MarketItem.find(query).sort({ createdAt: -1 }).lean();
    
    // Enrich with seller name and purchase stats
    const items = await Promise.all(itemsRaw.map(async (item: any) => {
      const seller = await mongoose.models.User.findOne({ discordId: item.sellerId }).lean();
      item.sellerName = seller ? seller.name : item.sellerId;
      
      const purchaseCount = await MarketPurchase.countDocuments({ marketItemId: item._id, pricePaid: { $gt: 0 } });
      item.purchases = purchaseCount;
      
      return item;
    }));

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("GET Manage Market Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data market" },
      { status: 500 }
    );
  }
}
