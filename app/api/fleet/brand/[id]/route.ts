import { NextResponse } from "next/server";
import mongoose from "mongoose";
import FleetBrand from "@/lib/models/FleetBrand";
import { deleteFileFromR2 } from "@/lib/r2";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }
    const { id } = await params;
    const body = await request.json();

    // Dapatkan data lama sebelum update untuk membersihkan file gambar
    const existingBrand = await FleetBrand.findOne({ id: id });

    const updatedBrand = await FleetBrand.findOneAndUpdate(
      { id: id },
      { $set: body },
      { returnDocument: "after", new: true }
    );

    if (!updatedBrand) {
      return NextResponse.json(
        { error: "Brand tidak ditemukan" },
        { status: 404 },
      );
    }

    // Jika logo diubah dan logo lama ada, hapus logo lama dari R2
    if (existingBrand && body.logo_url && existingBrand.logo_url !== body.logo_url) {
      await deleteFileFromR2(existingBrand.logo_url);
    }

    return NextResponse.json({ success: true, data: updatedBrand });
  } catch (error) {
    console.error("PATCH FleetBrand Error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate brand" },
      { status: 500 },
    );
  }
}
