import { NextResponse } from "next/server";
import mongoose from "mongoose";
import FleetBrand from "@/lib/models/FleetBrand";

import dbConnect from "@/lib/mongoose";
export async function GET() {
  try {
    await dbConnect();
    
    const brands = await FleetBrand.find({}).sort({ name: 1 }).lean();
    return NextResponse.json(brands, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("GET FleetBrand Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data brand" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();

    if (!data.id || !data.name) {
      return NextResponse.json({ error: "ID dan Nama wajib diisi" }, { status: 400 });
    }

    const newBrand = await FleetBrand.create({
      id: data.id,
      name: data.name,
      logo_url: data.logo_url || "",
    });

    return NextResponse.json({ success: true, message: "Brand berhasil ditambahkan!", data: newBrand });
  } catch (error) {
    console.error("POST FleetBrand Error:", error);
    return NextResponse.json({ error: "Gagal menambahkan brand" }, { status: 500 });
  }
}
