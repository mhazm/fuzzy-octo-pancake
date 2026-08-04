import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import { deleteFileFromR2 } from "@/lib/r2";

let Achievement: any;
try {
  Achievement = mongoose.model("Achievement");
} catch {
  Achievement = require("@/lib/models/Achievement");
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const { id } = await params;
    const data = await request.json();

    const achievement = await Achievement.findById(id);
    if (!achievement) {
      return NextResponse.json({ error: "Achievement tidak ditemukan" }, { status: 404 });
    }

    // Check codeId uniqueness if changed
    if (data.codeId && data.codeId !== achievement.codeId) {
      const existing = await Achievement.findOne({ codeId: data.codeId });
      if (existing) {
        return NextResponse.json({ error: "codeId sudah digunakan oleh achievement lain" }, { status: 400 });
      }
      achievement.codeId = data.codeId;
    }

    if (data.name) achievement.name = data.name;
    if (data.description !== undefined) achievement.description = data.description;
    
    // Jika imageUrl berubah, hapus file lama dari R2
    if (data.imageUrl !== undefined && data.imageUrl !== achievement.imageUrl) {
      if (achievement.imageUrl) {
        await deleteFileFromR2(achievement.imageUrl);
      }
      achievement.imageUrl = data.imageUrl;
    }
    
    if (data.category) achievement.category = data.category;

    await achievement.save();

    return NextResponse.json({ success: true, achievement });
  } catch (error) {
    console.error("PUT Achievement Error:", error);
    return NextResponse.json({ error: "Gagal memperbarui achievement" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const { id } = await params;
    const achievement = await Achievement.findById(id);
    if (!achievement) {
      return NextResponse.json({ error: "Achievement tidak ditemukan" }, { status: 404 });
    }

    // Hapus gambar dari R2 sebelum menghapus achievement
    if (achievement.imageUrl) {
      await deleteFileFromR2(achievement.imageUrl);
    }

    await Achievement.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Achievement berhasil dihapus" });
  } catch (error) {
    console.error("DELETE Achievement Error:", error);
    return NextResponse.json({ error: "Gagal menghapus achievement" }, { status: 500 });
  }
}
