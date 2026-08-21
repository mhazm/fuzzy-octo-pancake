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

    // Mengambil semua job dari user berdasarkan discordId (tersimpan sebagai driverId di jobhistories)
    const jobs = await db
      .collection("jobhistories")
      .find({ driverId: discordId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("GET MCP Jobs Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data jobs untuk MCP" },
      { status: 500 }
    );
  }
}
