import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const categories = await db.collection("kb_categories").find().sort({ order: 1 }).toArray();
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error("KB Categories Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil kategori KB" }, { status: 500 });
  }
}
