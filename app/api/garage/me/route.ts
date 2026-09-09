import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const client = await clientPromise;
    const db = client.db();

    const garage = await db.collection("garages").findOne({ discordId });
    const currency = await db.collection("currencies").findOne({ userId: discordId, guildId: process.env.GUILD_ID || "863959415702028318" });

    return NextResponse.json({ 
      success: true, 
      garage: garage || null,
      balance: currency?.totalNC || 0
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Error fetching garage data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
