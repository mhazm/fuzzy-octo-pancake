import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    // Mengambil semua cargo, diurutkan berdasarkan Game (ETS2 lalu ATS) lalu Nama
    const cargoes = await db
      .collection("cargos")
      .find({})
      .sort({ game_id: 1, name: 1 })
      .toArray();
    return NextResponse.json(cargoes, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data dari database" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const client = await clientPromise;
    const db = client.db();
    
    // Validasi field yang wajib
    if (!data.id || !data.name || !data.in_game_id || !data.game_id) {
      return NextResponse.json({ error: "Missing required fields: id, name, in_game_id, game_id" }, { status: 400 });
    }

    const result = await db.collection("cargos").insertOne({
      id: data.id,
      name: data.name,
      in_game_id: data.in_game_id,
      game_id: Number(data.game_id),
      price_per_km: data.price_per_km ? Number(data.price_per_km) : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Cargo created successfully" });
  } catch (error) {
    console.error("POST Cargo Error:", error);
    return NextResponse.json(
      { error: "Gagal membuat data cargo baru" },
      { status: 500 },
    );
  }
}
