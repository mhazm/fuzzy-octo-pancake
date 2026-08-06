import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();
    const body = await request.json();

    const updateFields: any = {};
    if (body.price_per_km !== undefined) updateFields.price_per_km = Number(body.price_per_km);
    if (body.in_game_id !== undefined) updateFields.in_game_id = String(body.in_game_id);
    if (body.name !== undefined) updateFields.name = String(body.name);
    if (body.adr_class !== undefined) updateFields.adr_class = Number(body.adr_class);
    if (body.fragility !== undefined) updateFields.fragility = Number(body.fragility);
    if (body.overweight !== undefined) updateFields.overweight = Boolean(body.overweight);
    if (body.market_demand !== undefined) updateFields.market_demand = Number(body.market_demand);

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang diupdate" }, { status: 400 });
    }

    const updatedCargo = await db.collection("cargos").findOneAndUpdate(
      { id: id },
      { $set: updateFields },
      { returnDocument: "after" },
    );

    if (!updatedCargo) {
      return NextResponse.json(
        { error: "Cargo tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(updatedCargo);
  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui cargo" },
      { status: 500 },
    );
  }
}
