import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Fleet from "@/lib/models/Fleet";
import "@/lib/models/FleetStore";
import "@/lib/models/User";
import "@/lib/models/FleetBrand";

import dbConnect from "@/lib/mongoose";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    // Pastikan jika owner dikosongkan dari form (string kosong), diset ke null
    if (body.owner === "") {
      body.owner = null;
    }

    // Set driver sama dengan owner
    if (body.owner !== undefined) {
       body.driver = body.owner;
    }

    const updatedFleet = await Fleet.findOneAndUpdate(
      { _id: id }, // ID dari Mongo
      { $set: body },
      { returnDocument: "after", new: true },
    )
      .populate({
        path: "model",
        populate: { path: "brand" },
      })
      .populate("owner");

    if (!updatedFleet) {
      return NextResponse.json(
        { error: "Fleet tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updatedFleet });
  } catch (error) {
    console.error("PATCH Fleet Assign Error:", error);
    return NextResponse.json(
      { error: "Gagal mengupdate fleet assign" },
      { status: 500 },
    );
  }
}
