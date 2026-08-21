import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : 50;

    const client = await clientPromise;
    const db = client.db();

    const [cargos, history] = await Promise.all([
      db.collection("cargos").find({}).limit(limit).toArray(),
      db.collection("cargomarkethistories").find({}).sort({ createdAt: -1 }).limit(limit).toArray(),
    ]);

    return NextResponse.json({
      cargos,
      history,
    });
  } catch (error) {
    console.error("GET MCP Cargo Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data cargo untuk MCP" },
      { status: 500 }
    );
  }
}
