import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const discordId = searchParams.get("discordId");

    if (!discordId) {
      return NextResponse.json(
        { error: "Query parameter 'discordId' is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const transactions = await db
      .collection("transactions")
      .find({ discordId: discordId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("GET MCP Transactions Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data transactions untuk MCP" },
      { status: 500 }
    );
  }
}
