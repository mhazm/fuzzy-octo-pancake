import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";
    if (!isManager) {
      return NextResponse.json({ success: false, error: "Akses Ditolak" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db();
    const categories = await db.collection("kb_categories").find().sort({ order: 1 }).toArray();

    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    console.error("Manager KB Categories Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Kesalahan internal server" }, { status: 500 });
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
      return NextResponse.json({ success: false, error: "Akses Ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const { name, order } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check if category name already exists
    const existing = await db.collection("kb_categories").findOne({ name: name.trim() });
    if (existing) {
      return NextResponse.json({ success: false, error: "Nama kategori sudah ada" }, { status: 400 });
    }

    let baseSlug = generateSlug(name.trim());
    let slug = baseSlug;
    let counter = 1;
    while (await db.collection("kb_categories").findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newCategory = {
      name: name.trim(),
      slug,
      order: order !== undefined ? Number(order) : 0,
      createdAt: new Date(),
    };

    const result = await db.collection("kb_categories").insertOne(newCategory);

    return NextResponse.json({ success: true, categoryId: result.insertedId });
  } catch (error: any) {
    console.error("Manager KB Category Create Error:", error);
    return NextResponse.json({ success: false, error: "Kesalahan internal server" }, { status: 500 });
  }
}
