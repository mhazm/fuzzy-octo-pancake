import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const goals = await db
      .collection("communitygoals")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(goals);
  } catch (error) {
    console.error("GET MCP Goals Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data community goals untuk MCP" },
      { status: 500 }
    );
  }
}
