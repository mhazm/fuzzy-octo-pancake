import { NextResponse } from "next/server";
import mongoose from "mongoose";
import FleetStore from "@/lib/models/FleetStore";
import "@/lib/models/FleetBrand"; 
import { deleteFileFromR2 } from "@/lib/r2";

import dbConnect from "@/lib/mongoose";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    // Dapatkan data lama sebelum update untuk membersihkan file gambar
    const existingStore = await FleetStore.findOne({ id: id });

    const updatedStore = await FleetStore.findOneAndUpdate(
      { id: id },
      { $set: body },
      { returnDocument: "after", new: true } // Mongoose uses 'new: true' for returning updated doc
    ).populate("brand");

    if (!updatedStore) {
      return NextResponse.json(
        { error: "Kendaraan tidak ditemukan" },
        { status: 404 },
      );
    }

    // Jika photo diubah dan photo lama ada, hapus photo lama dari R2
    if (existingStore && body.photo_url && existingStore.photo_url !== body.photo_url) {
      await deleteFileFromR2(existingStore.photo_url);
    }

    return NextResponse.json({ success: true, data: updatedStore });
  } catch (error) {
    console.error("PATCH FleetStore Error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate kendaraan" },
      { status: 500 },
    );
  }
}
