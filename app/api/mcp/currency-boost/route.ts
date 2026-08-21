import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const events = await db
      .collection("ncevents")
      .find({ isActive: "true" })
      .sort({ startDate: -1 })
      .toArray();

    return NextResponse.json(events);
  } catch (error) {
    console.error("GET MCP NC Event Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data currency boost (ncevent) untuk MCP" },
      { status: 500 },
    );
  }
}
