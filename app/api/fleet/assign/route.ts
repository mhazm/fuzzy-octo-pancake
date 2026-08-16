import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Fleet from "@/lib/models/Fleet";
import "@/lib/models/FleetStore"; // Ensure it's registered for populate
import "@/lib/models/User"; // Ensure it's registered for populate
import "@/lib/models/FleetBrand";

import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();

    const fleets = await Fleet.find({})
      .populate({
        path: "model",
        populate: { path: "brand" },
      })
      .populate("owner")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(fleets, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("GET Fleet Assign Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data fleet assign" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();

    if (
      !data.id ||
      !data.fleet_name ||
      !data.game_id ||
      !data.fleet_number ||
      !data.model ||
      data.odometer === undefined
    ) {
      return NextResponse.json(
        { error: "Kolom wajib belum diisi" },
        { status: 400 },
      );
    }

    const newFleet = await Fleet.create({
      id: data.id,
      fleet_name: data.fleet_name,
      game_id: data.game_id,
      fleet_number: data.fleet_number,
      owner: data.owner || null,
      driver: data.owner || null, // Keep driver in sync with owner for legacy features
      model: data.model,
      odometer: Number(data.odometer),
      wheels: data.wheels || "4x2",
      status: data.status || "active",
      has_insurance: data.has_insurance || false,
    });

    return NextResponse.json({
      success: true,
      message: "Fleet berhasil ditambahkan!",
      data: newFleet,
    });
  } catch (error) {
    console.error("POST Fleet Assign Error:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan fleet" },
      { status: 500 },
    );
  }
}
