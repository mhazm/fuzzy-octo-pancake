import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import FuelPrice from "@/lib/models/FuelPrice";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get("range");
    const days = rangeParam ? parseInt(rangeParam) : 1;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Dapatkan harga saat ini (yang terbaru)
    const currentPriceData = await FuelPrice.findOne().sort({ timestamp: -1 });
    
    // Dapatkan historical data berdasarkan range hari
    let history = await FuelPrice.find({ timestamp: { $gte: cutoffDate } })
                                 .sort({ timestamp: -1 })
                                 .lean();
    
    // Fallback jika tidak ada data sama sekali dalam rentang waktu tersebut (misal server baru nyala)
    if (history.length === 0) {
      history = await FuelPrice.find().sort({ timestamp: -1 }).limit(24).lean();
    }
    
    // Reverse agar berurutan dari yang terlama ke terbaru untuk chart
    const chartData = history.reverse().map(h => {
      const d = new Date(h.timestamp);
      
      let timeLabel = "";
      if (days === 1) {
        timeLabel = d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace('.', ':');
      } else {
        timeLabel = d.toLocaleString("id-ID", { day: '2-digit', month: 'short', timeZone: 'Asia/Jakarta' });
      }

      return {
        time: timeLabel,
        fullDate: d.toLocaleString("id-ID", { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + " WIB",
        price: h.price
      };
    });

    return NextResponse.json({ 
      success: true, 
      currentPrice: currentPriceData?.price || 0,
      lastUpdate: currentPriceData?.timestamp || new Date(),
      chartData
    });
  } catch (error: any) {
    console.error("Error fetching system fuel data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
