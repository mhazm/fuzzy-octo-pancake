import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import FuelPrice from "@/lib/models/FuelPrice";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    // Gunakan env variable untuk secret token, dengan fallback
    const expectedToken = process.env.NISMARA_SECRET_API;

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Ambil harga terakhir dari database
    const lastPriceData = await FuelPrice.findOne().sort({ timestamp: -1 });
    let rawPrice = 0.5; // Harga default jika database kosong

    if (lastPriceData) {
      const lastPrice = lastPriceData.price;
      
      // Maksimal naik atau turun sebesar 0.15 NC per jam (Volatilitas)
      const maxChange = 0.15;
      
      // Random pergerakan dari -0.15 hingga +0.15
      const change = (Math.random() * (maxChange * 2)) - maxChange;
      
      rawPrice = lastPrice + change;
      
      // Jaga agar harga tidak keluar dari batas kewajaran (0.10 - 1.00)
      if (rawPrice > 1.0) rawPrice = 1.0;
      if (rawPrice < 0.1) rawPrice = 0.1;
    }

    // Bulatkan ke 2 desimal
    const newPrice = Math.round(rawPrice * 100) / 100;

    const newFuelPrice = new FuelPrice({
      price: newPrice,
    });

    await newFuelPrice.save();

    return NextResponse.json({
      success: true,
      price: newPrice,
      message: "Fuel price updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating fuel price:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
