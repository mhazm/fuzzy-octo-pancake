import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : 50;

    const game = searchParams.get("game")?.toLowerCase();
    const name = searchParams.get("name");
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const client = await clientPromise;
    const db = client.db();

    // 1. Build Query
    const query: any = {};
    if (game === "ets2" || game === "1") {
      query.game_id = 1;
    } else if (game === "ats" || game === "2") {
      query.game_id = 2;
    }

    if (name) {
      query.$or = [
        { name: { $regex: name, $options: "i" } },
        { in_game_id: { $regex: name, $options: "i" } }
      ];
    }

    // 2. Build Sort
    const sort: any = {};
    if (sortBy) {
        if (sortBy === "price" || sortBy === "price_per_km") {
            sort.price_per_km = sortOrder;
        } else if (sortBy === "final_price" || sortBy === "price_per_km_with_market_change") {
            sort.price_per_km_with_market_change = sortOrder;
        } else {
            sort[sortBy] = sortOrder;
        }
    } else {
        sort.updatedAt = -1;
    }

    // 3. Execute Query
    const cargos = await db
      .collection("cargos")
      .find(query)
      .sort(sort)
      .limit(limit)
      .toArray();

    // 4. Fetch history for the returned cargos only
    const cargoIds = cargos.map((c) => c._id);
    const history = await db
      .collection("cargomarkethistories")
      .find({ cargo_id: { $in: cargoIds } })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      cargos,
      history,
    });
  } catch (error) {
    console.error("GET MCP Cargo Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data cargo untuk MCP" },
      { status: 500 }
    );
  }
}
