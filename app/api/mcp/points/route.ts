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
    
    // Fallback ID guild Nismara sesuai rules jika env tidak tersedia
    const guildId = process.env.DISCORD_GUILD_ID || process.env.GUILD_ID || "863959415702028318";

    // Menarik data total poin penalti dan histori poin secara paralel
    const [pointsData, historyData] = await Promise.all([
      db.collection("points").findOne({ userId: discordId, guildId }),
      db
        .collection("pointhistories")
        .find({ userId: discordId, guildId })
        .sort({ createdAt: -1 })
        .toArray(),
    ]);

    return NextResponse.json({
      point: pointsData || { totalPoints: 0, userId: discordId, guildId },
      history: historyData,
    });
  } catch (error) {
    console.error("GET MCP Points Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data poin penalti untuk MCP" },
      { status: 500 }
    );
  }
}
