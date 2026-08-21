import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const category = searchParams.get("category");

    const client = await clientPromise;
    const db = client.db();

    let query: any = {};
    if (q) query.name = { $regex: q, $options: "i" };
    if (category) query.category = category;

    const items = await db
      .collection("marketitems")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET MCP Market Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data market items untuk MCP" },
      { status: 500 }
    );
  }
}
