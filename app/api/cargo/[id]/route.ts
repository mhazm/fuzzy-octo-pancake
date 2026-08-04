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
    const { price_per_km } = body;

    if (price_per_km === undefined) {
      return NextResponse.json({ error: "Harga tidak valid" }, { status: 400 });
    }

    const updatedCargo = await db.collection("cargos").findOneAndUpdate(
      { id: id }, // Cari berdasarkan custom ID dari JSON
      { $set: { price_per_km: Number(price_per_km) } },
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
      { error: "Gagal memperbarui harga" },
      { status: 500 },
    );
  }
}
