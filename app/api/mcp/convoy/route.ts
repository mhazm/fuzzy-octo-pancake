import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const client = await clientPromise;
    const db = client.db();

    let query: any = {};
    if (status) {
      query.status = status;
    } else {
      // Default: exclude COMPLETED/CANCELED to show active/upcoming
      query.status = { $nin: ["COMPLETED", "CANCELED"] };
    }

    const convoys = await db
      .collection("convoylobbies")
      .find(query)
      .sort({ scheduledTime: 1 })
      .toArray();

    return NextResponse.json(convoys);
  } catch (error) {
    console.error("GET MCP Convoy Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data convoy untuk MCP" },
      { status: 500 }
    );
  }
}
