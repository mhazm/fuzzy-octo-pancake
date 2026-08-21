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

    const user = await db.collection("users").findOne({ discordId });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const [garage, fleets] = await Promise.all([
      db.collection("garages").findOne({ discordId: discordId }),
      db.collection("fleets").find({ owner: user._id }).toArray(),
    ]);

    return NextResponse.json({
      garage: garage || { discordId: discordId, slots: 0, location: "" },
      fleets: fleets,
    });
  } catch (error) {
    console.error("GET MCP Garage Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data garage dan fleets untuk MCP" },
      { status: 500 }
    );
  }
}
