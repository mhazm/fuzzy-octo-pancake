import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";
    if (!isManager) {
      return NextResponse.json(
        { success: false, error: "Akses Ditolak" },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const categories = await db.collection("kb_categories").find().sort({ order: 1 }).toArray();

    return NextResponse.json({ success: true, categories }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error("Manager KB Categories Fetch Error:", error);
    return NextResponse.json(
      { success: false, error: "Kesalahan internal server" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

function generateSlug(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";
    if (!isManager) {
      return NextResponse.json(
        { success: false, error: "Akses Ditolak" },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

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

    // Check if category name already exists
    const existing = await db.collection("kb_categories").findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Nama kategori sudah ada" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    let baseSlug = generateSlug(name.trim());
    let slug = baseSlug;
    let counter = 1;
    while (await db.collection("kb_categories").findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const validAccessLevels = ["public", "driver", "manager"];
    const level = validAccessLevels.includes(accessLevel) ? accessLevel : "public";

    const newCategory = {
      name: name.trim(),
      slug,
      order: order !== undefined ? Number(order) : 0,
      accessLevel: level,
      createdAt: new Date(),
    };

    const result = await db.collection("kb_categories").insertOne(newCategory);

    // Invalidate caches immediately
    try {
      revalidatePath("/kb");
      revalidatePath(`/kb/${slug}`);
      revalidatePath("/dashboard/manage/kb");
      revalidatePath("/dashboard/manage/kb/categories");
    } catch (revalErr) {
      console.error("Failed to revalidate KB category on create:", revalErr);
    }

    return NextResponse.json(
      { success: true, categoryId: result.insertedId },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("Manager KB Category Create Error:", error);
    return NextResponse.json(
      { success: false, error: "Kesalahan internal server" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
