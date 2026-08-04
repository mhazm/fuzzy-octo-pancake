import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";

// Import Achievement model (CommonJS)
let Achievement: any;
try {
  Achievement = mongoose.model("Achievement");
} catch {
  Achievement = require("@/lib/models/Achievement");
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const achievements = await Achievement.find().sort({ category: 1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, achievements });
  } catch (error) {
    console.error("GET Achievements Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data achievement" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const data = await request.json();

    if (!data.codeId || !data.name || !data.category) {
      return NextResponse.json({ error: "codeId, name, dan category wajib diisi" }, { status: 400 });
    }

    // Check for duplicate codeId
    const existing = await Achievement.findOne({ codeId: data.codeId });
    if (existing) {
      return NextResponse.json({ error: "codeId sudah digunakan" }, { status: 400 });
    }

    const achievement = await Achievement.create({
      codeId: data.codeId,
      name: data.name,
      description: data.description || "Belum ada deskripsi.",
      imageUrl: data.imageUrl || null,
      category: data.category,
    });

    return NextResponse.json({ success: true, achievement });
  } catch (error) {
    console.error("POST Achievement Error:", error);
    return NextResponse.json({ error: "Gagal membuat achievement" }, { status: 500 });
  }
}
