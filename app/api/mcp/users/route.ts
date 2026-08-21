import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.length < 3) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required and must be at least 3 characters long" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const users = await db
      .collection("users")
      .find(
        {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { discordId: { $regex: q, $options: "i" } },
          ],
        },
        {
          projection: {
            _id: 0,
            name: 1,
            discordId: 1,
            truckyId: 1,
            truckyRank: 1,
            truckyRole: 1,
            level: 1,
            xp: 1,
            discordRole: 1,
            "nismaraplus.status": 1,
            "insurance.status": 1,
            "insurance.rating": 1,
            isBooster: 1,
            image: 1
          },
        }
      )
      .limit(10)
      .toArray();

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET MCP Users Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data user untuk MCP" },
      { status: 500 }
    );
  }
}
