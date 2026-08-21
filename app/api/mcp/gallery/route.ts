import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get("discordId");

    const client = await clientPromise;
    const db = client.db();

    let query: any = {};
    if (discordId) {
      query.userId = discordId;
    }

    const posts = await db
      .collection("galleryposts")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(posts);
  } catch (error) {
    console.error("GET MCP Gallery Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data gallery untuk MCP" },
      { status: 500 }
    );
  }
}
