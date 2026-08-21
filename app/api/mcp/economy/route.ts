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
    
    const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || "863959415702028318";

    const [currency, history] = await Promise.all([
      db.collection("currencies").findOne({ userId: discordId, guildId }),
      db
        .collection("currencyhistories")
        .find({ userId: discordId, guildId })
        .sort({ createdAt: -1 })
        .toArray(),
    ]);

    return NextResponse.json({
      currency: currency || { totalNC: 0, userId: discordId, guildId },
      history: history,
    });
  } catch (error) {
    console.error("GET MCP Economy Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data economy untuk MCP" },
      { status: 500 }
    );
  }
}
