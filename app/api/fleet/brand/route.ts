import { NextResponse } from "next/server";
import mongoose from "mongoose";
import FleetBrand from "@/lib/models/FleetBrand";
import { revalidatePath } from "next/cache";

import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    await dbConnect();
    
    const brands = await FleetBrand.find({}).sort({ name: 1 }).lean();
    return NextResponse.json(brands, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
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

    try {
      revalidatePath("/dashboard/manage/fleet/brand");
      revalidatePath("/dashboard/manage/fleet/store");
      revalidatePath("/dashboard/garage/fleet/buy");
    } catch (e) {
      console.error("Failed to revalidate fleet brand paths", e);
    }

    return NextResponse.json({ success: true, message: "Brand berhasil ditambahkan!", data: newBrand });
  } catch (error) {
    console.error("POST FleetBrand Error:", error);
    return NextResponse.json({ error: "Gagal menambahkan brand" }, { status: 500 });
  }
}
