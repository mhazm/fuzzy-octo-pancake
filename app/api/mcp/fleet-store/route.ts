import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    const client = await clientPromise;
    const db = client.db();

    // Opsional query berdasarkan nama
    let query: any = {};
    if (q) {
      query.name = { $regex: q, $options: "i" };
    }

    // Gunakan aggregate untuk lookup detail brand dari FleetBrand
    const fleetStores = await db
      .collection("fleetstores")
      .aggregate([
        { $match: query },
        {
          $lookup: {
            from: "fleetbrands", // Mongoose plural form of FleetBrand
            localField: "brand",
            foreignField: "_id",
            as: "brandDetail",
          },
        },
        {
          $unwind: {
            path: "$brandDetail",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: { price: 1 }
        }
      ])
      .toArray();

    return NextResponse.json(fleetStores);
  } catch (error) {
    console.error("GET MCP FleetStore Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data fleet store untuk MCP" },
      { status: 500 }
    );
  }
}
