import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const [fuelPrice, marketListings] = await Promise.all([
      db.collection("fuelprices").find({}).sort({ date: -1 }).limit(10).toArray(),
      db.collection("fuelmarketlistings").find({ status: "active" }).sort({ createdAt: -1 }).toArray(),
    ]);

    return NextResponse.json({
      globalPrice: fuelPrice,
      listings: marketListings,
    });
  } catch (error) {
    console.error("GET MCP Fuel Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data fuel market untuk MCP" },
      { status: 500 }
    );
  }
}
