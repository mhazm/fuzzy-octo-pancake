import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Mengambil user dari collection users, proyeksikan hanya ID, nama, dan info penting lainnya
    const users = await db.collection("users").find(
      {},
      { projection: { _id: 1, name: 1, discordId: 1, truckyId: 1 } }
    ).toArray();

    return NextResponse.json(users, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("GET Users Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data user" }, { status: 500 });
  }
}
