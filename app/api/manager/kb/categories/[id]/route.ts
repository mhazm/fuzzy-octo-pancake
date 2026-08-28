import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";
    if (!isManager) {
      return NextResponse.json({ success: false, error: "Akses Ditolak" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, order } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const existing = await db.collection("kb_categories").findOne({ 
      name: name.trim(),
      _id: { $ne: new ObjectId(id) }
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "Nama kategori sudah ada" }, { status: 400 });
    }

    const oldCategory = await db.collection("kb_categories").findOne({ _id: new ObjectId(id) });
    if (!oldCategory) {
      return NextResponse.json({ success: false, error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    await db.collection("kb_categories").updateOne(
      { _id: new ObjectId(id) },
      { $set: { 
        name: name.trim(),
        order: order !== undefined ? Number(order) : oldCategory.order
      }}
    );

    // If name changed, update all articles with the old category name
    if (oldCategory.name !== name.trim()) {
      await db.collection("kb_articles").updateMany(
        { category: oldCategory.name },
        { $set: { category: name.trim() } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Manager KB Category Update Error:", error);
    return NextResponse.json({ success: false, error: "Kesalahan internal server" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";
    if (!isManager) {
      return NextResponse.json({ success: false, error: "Akses Ditolak" }, { status: 403 });
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();

    const category = await db.collection("kb_categories").findOne({ _id: new ObjectId(id) });
    if (!category) {
      return NextResponse.json({ success: false, error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    const articlesCount = await db.collection("kb_articles").countDocuments({ category: category.name });
    if (articlesCount > 0) {
      return NextResponse.json({ success: false, error: `Tidak bisa dihapus, ada ${articlesCount} artikel di dalam kategori ini` }, { status: 400 });
    }

    await db.collection("kb_categories").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Manager KB Category Delete Error:", error);
    return NextResponse.json({ success: false, error: "Kesalahan internal server" }, { status: 500 });
  }
}
