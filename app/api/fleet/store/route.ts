import { NextResponse } from "next/server";
import mongoose from "mongoose";
import FleetStore from "@/lib/models/FleetStore";
import "@/lib/models/FleetBrand"; 

import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    
    const stores = await FleetStore.find({}).populate("brand").sort({ game_id: 1, type: 1, name: 1 }).lean();
    return NextResponse.json(stores, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("GET FleetStore Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data fleet store" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();

    if (!data.id || !data.name || !data.game_id || data.in_game_id === undefined || !data.type || !data.price || !data.brand || !data.photo_url) {
      return NextResponse.json({ error: "Semua field wajib diisi (termasuk in_game_id)" }, { status: 400 });
    }

    const newStore = await FleetStore.create({
      id: data.id,
      name: data.name,
      game_id: Number(data.game_id),
      in_game_id: data.in_game_id,
      type: data.type,
      price: Number(data.price),
      photo_url: data.photo_url,
      brand: data.brand,
      component_cost_maintenance: data.component_cost_maintenance,
      component_cost_unfix_wear: data.component_cost_unfix_wear,
    });

    return NextResponse.json({ success: true, message: "Kendaraan berhasil ditambahkan!", data: newStore });
  } catch (error) {
    console.error("POST FleetStore Error:", error);
    return NextResponse.json({ error: "Gagal menambahkan kendaraan" }, { status: 500 });
  }
}
