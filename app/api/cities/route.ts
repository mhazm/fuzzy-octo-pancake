import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const revalidate = 86400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");

  if (!gameId) {
    return NextResponse.json(
      { error: "Parameter gameId diperlukan" },
      { status: 400 }
    );
  }

  // ETS2 (1) dan ATS (2)
  const gameValue = gameId === "1" ? "1" : "2";

  try {
    const client = await clientPromise;
    const db = client.db();
    
    const cities = await db
      .collection("cities")
      .find({ game: gameValue })
      .sort({ real_name: 1 })
      .toArray();

    const formattedCities = cities.map((city) => {
      const dlcLabel = city.dlc && city.dlc.trim() !== "" ? city.dlc : "Base Game";
      return {
        id: city.id,
        real_name: `${city.real_name} (${dlcLabel})`,
      };
    });

    return NextResponse.json({ success: true, cities: formattedCities });
  } catch (error) {
    console.error("Gagal mengambil data kota:", error);
    return NextResponse.json(
      { error: "Gagal memproses data dari server" },
      { status: 500 }
    );
  }
}
