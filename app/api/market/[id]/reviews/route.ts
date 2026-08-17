import { NextResponse } from "next/server";
import mongoose from "mongoose";
import MarketItem from "@/lib/models/MarketItem";
import MarketPurchase from "@/lib/models/MarketPurchase";
import MarketReview from "@/lib/models/MarketReview";
import "@/lib/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

import dbConnect from "@/lib/mongoose";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await dbConnect();

    const query = mongoose.isValidObjectId(id) 
      ? { $or: [{ slug: id }, { _id: id }] }
      : { slug: id };
    const item = await MarketItem.findOne(query);
    if (!item) {
      return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    }

    // 1. Dapatkan jumlah pembeli
    const totalBuyers = await MarketPurchase.countDocuments({ marketItemId: item._id });

    // 2. Dapatkan ulasan
    const reviewsRaw = await MarketReview.find({ marketItemId: item._id }).sort({ updatedAt: -1 }).lean();

    // 3. Ambil data pembeli dan hitung rata-rata rating
    let totalRating = 0;
    const reviews = [];

    for (const review of reviewsRaw) {
      const user = await mongoose.models.User.findOne({ discordId: review.buyerId }).lean();
      totalRating += review.rating;
      
      reviews.push({
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        updatedAt: review.updatedAt,
        createdAt: review.createdAt,
        user: {
          name: user ? user.name : "Unknown",
          image: user ? user.image : null,
          truckyId: user ? user.truckyId : null,
          isNismaraPlus: user && user.nismaraplus ? user.nismaraplus.status : false,
          nismaraPlusStartedAt: user && user.nismaraplus ? user.nismaraplus.startedAt : null,
          isBooster: user ? user.isBooster : false,
          isManager: user ? (user.discordRole === "manager" || user.discordRole === "admin") : false,
        }
      });
    }

    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    return NextResponse.json({
      totalBuyers,
      averageRating,
      totalReviews: reviews.length,
      reviews
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("GET MarketReviews Error:", error);
    return NextResponse.json({ error: "Gagal memuat ulasan" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const query = mongoose.isValidObjectId(id) 
      ? { $or: [{ slug: id }, { _id: id }] }
      : { slug: id };
    const item = await MarketItem.findOne(query);
    if (!item) {
      return NextResponse.json({ error: "Barang tidak ditemukan" }, { status: 404 });
    }

    const buyerId = session.user.discordId as string;

    // Cek apakah sudah membeli (atau gratis)
    const isPurchased = await MarketPurchase.findOne({ buyerId, marketItemId: item._id as any });
    const isOwner = item.sellerId === buyerId;
    
    // Asumsi: owner dan yang sudah beli bisa mereview. 
    // Atau hanya yang sudah beli. Kita batasi hanya yang sudah beli/download. 
    // Gratisan: Kalau gratis, logikanya mereka langsung download, tidak ada MarketPurchase jika gratis dan ga klik beli.
    // Tapi wait, script beli sebelumnya, kalau gratis apakah ada MarketPurchase?
    // Di `app/api/market/[id]/buy/route.ts`, gratis (price=0) tetap diproses sebagai pembelian (pricePaid: 0), sehingga membuat `MarketPurchase`.
    if (!isPurchased && !isOwner) {
      return NextResponse.json({ error: "Hanya pembeli yang bisa memberikan ulasan" }, { status: 403 });
    }

    const { rating, comment } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating tidak valid" }, { status: 400 });
    }
    if (!comment || comment.trim().length === 0) {
      return NextResponse.json({ error: "Komentar wajib diisi" }, { status: 400 });
    }

    const review = await MarketReview.findOneAndUpdate(
      { marketItemId: item._id as any, buyerId },
      { rating, comment },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error("POST MarketReviews Error:", error);
    return NextResponse.json({ error: "Gagal menyimpan ulasan" }, { status: 500 });
  }
}
