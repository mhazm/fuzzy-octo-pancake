import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";
    if (!isManager) {
      return NextResponse.json({ success: false, error: "Akses Ditolak" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, content, category, accessLevel, coverImage, order } = body;

    const resolvedParams = await params;
    const articleId = resolvedParams.id;

    if (!ObjectId.isValid(articleId)) {
      return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    let categorySlug = "uncategorized";
    if (category) {
      const catDoc = await db.collection("kb_categories").findOne({ name: category });
      if (catDoc && catDoc.slug) categorySlug = catDoc.slug;
    }

    const updateData: any = {
      title,
      description: description || "",
      content,
      category,
      categorySlug,
      accessLevel,
      updatedAt: new Date(),
    };

    if (order !== undefined) {
      updateData.order = Number(order);
    }

    if (coverImage !== undefined) {
      updateData.coverImage = coverImage;
    }

    await db.collection("kb_articles").updateOne(
      { _id: new ObjectId(articleId) },
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Manager KB Update Error:", error);
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

    const resolvedParams = await params;
    const articleId = resolvedParams.id;

    if (!ObjectId.isValid(articleId)) {
      return NextResponse.json({ success: false, error: "ID tidak valid" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    await db.collection("kb_articles").deleteOne({ _id: new ObjectId(articleId) });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Manager KB Delete Error:", error);
    return NextResponse.json({ success: false, error: "Kesalahan internal server" }, { status: 500 });
  }
}
