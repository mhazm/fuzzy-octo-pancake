import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";
    if (!isManager) {
      return NextResponse.json(
        { success: false, error: "Akses Ditolak" },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { name, order, accessLevel } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Nama kategori wajib diisi" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const existing = await db.collection("kb_categories").findOne({ 
      name: name.trim(),
      _id: { $ne: new ObjectId(id) }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Nama kategori sudah ada" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const oldCategory = await db.collection("kb_categories").findOne({ _id: new ObjectId(id) });
    if (!oldCategory) {
      return NextResponse.json(
        { success: false, error: "Kategori tidak ditemukan" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const validAccessLevels = ["public", "driver", "manager"];
    const level = validAccessLevels.includes(accessLevel) ? accessLevel : oldCategory.accessLevel || "public";

    await db.collection("kb_categories").updateOne(
      { _id: new ObjectId(id) },
      { $set: { 
        name: name.trim(),
        order: order !== undefined ? Number(order) : oldCategory.order,
        accessLevel: level,
      }}
    );

    // If name changed, update all articles with the old category name
    if (oldCategory.name !== name.trim()) {
      await db.collection("kb_articles").updateMany(
        { category: oldCategory.name },
        { $set: { category: name.trim() } }
      );
    }

    // Invalidate caches immediately
    try {
      revalidatePath("/kb");
      if (oldCategory.slug) revalidatePath(`/kb/${oldCategory.slug}`);
      revalidatePath("/dashboard/manage/kb");
      revalidatePath("/dashboard/manage/kb/categories");
    } catch (revalErr) {
      console.error("Failed to revalidate KB category on update:", revalErr);
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error("Manager KB Category Update Error:", error);
    return NextResponse.json(
      { success: false, error: "Kesalahan internal server" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";
    if (!isManager) {
      return NextResponse.json(
        { success: false, error: "Akses Ditolak" },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();

    const category = await db.collection("kb_categories").findOne({ _id: new ObjectId(id) });
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Kategori tidak ditemukan" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const articlesCount = await db.collection("kb_articles").countDocuments({ category: category.name });
    if (articlesCount > 0) {
      return NextResponse.json(
        { success: false, error: `Tidak bisa dihapus, ada ${articlesCount} artikel di dalam kategori ini` },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    await db.collection("kb_categories").deleteOne({ _id: new ObjectId(id) });

    // Invalidate caches immediately
    try {
      revalidatePath("/kb");
      if (category.slug) revalidatePath(`/kb/${category.slug}`);
      revalidatePath("/dashboard/manage/kb");
      revalidatePath("/dashboard/manage/kb/categories");
    } catch (revalErr) {
      console.error("Failed to revalidate KB category on delete:", revalErr);
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error("Manager KB Category Delete Error:", error);
    return NextResponse.json(
      { success: false, error: "Kesalahan internal server" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
