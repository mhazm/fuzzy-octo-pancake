import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import TicketCategory from "@/lib/models/TicketCategory";

export async function GET(request: Request) {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const categories = await TicketCategory.find({ isActive: true }).sort({ name: 1 });
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("Manage TicketCategory GET Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Nama kategori harus diisi" }, { status: 400 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const newCategory = await TicketCategory.create({ name, isActive: true });
    return NextResponse.json({ success: true, category: newCategory });
  } catch (error) {
    console.error("Manage TicketCategory POST Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
