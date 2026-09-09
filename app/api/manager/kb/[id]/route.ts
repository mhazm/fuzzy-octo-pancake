import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]/route";
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

    const body = await req.json();
    const { title, description, content, category, accessLevel, coverImage, order } = body;

    const resolvedParams = await params;
    const articleId = resolvedParams.id;

    if (!ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { success: false, error: "ID tidak valid" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const existingArticle = await db.collection("kb_articles").findOne({ _id: new ObjectId(articleId) });
    if (!existingArticle) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    let categorySlug = existingArticle.categorySlug || "uncategorized";
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

    // Invalidate caches immediately
    try {
      revalidatePath("/kb");
      revalidatePath(`/kb/${categorySlug}`);
      revalidatePath(`/kb/${categorySlug}/${existingArticle.slug}`);
      if (existingArticle.categorySlug && existingArticle.categorySlug !== categorySlug) {
        revalidatePath(`/kb/${existingArticle.categorySlug}`);
        revalidatePath(`/kb/${existingArticle.categorySlug}/${existingArticle.slug}`);
      }
      revalidatePath("/dashboard/manage/kb");
    } catch (revalErr) {
      console.error("Failed to revalidate KB path on update:", revalErr);
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error("Manager KB Update Error:", error);
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

    const resolvedParams = await params;
    const articleId = resolvedParams.id;

    if (!ObjectId.isValid(articleId)) {
      return NextResponse.json(
        { success: false, error: "ID tidak valid" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const existingArticle = await db.collection("kb_articles").findOne({ _id: new ObjectId(articleId) });
    if (!existingArticle) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    await db.collection("kb_articles").deleteOne({ _id: new ObjectId(articleId) });

    // Invalidate caches immediately
    try {
      revalidatePath("/kb");
      if (existingArticle.categorySlug) {
        revalidatePath(`/kb/${existingArticle.categorySlug}`);
        revalidatePath(`/kb/${existingArticle.categorySlug}/${existingArticle.slug}`);
      }
      revalidatePath("/dashboard/manage/kb");
    } catch (revalErr) {
      console.error("Failed to revalidate KB path on delete:", revalErr);
    }

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
  } catch (error: any) {
    console.error("Manager KB Delete Error:", error);
    return NextResponse.json(
      { success: false, error: "Kesalahan internal server" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
