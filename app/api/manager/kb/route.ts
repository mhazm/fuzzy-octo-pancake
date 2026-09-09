import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
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

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category") || "all";
    const sortParam = searchParams.get("sort") || "newest";

    const filter: any = {};
    if (category !== "all") {
      filter.category = category;
    }

    let sortOption: any = { createdAt: -1 };
    if (sortParam === "oldest") sortOption = { createdAt: 1 };
    if (sortParam === "views_desc") sortOption = { views: -1 };
    if (sortParam === "views_asc") sortOption = { views: 1 };
    if (sortParam === "title_asc") sortOption = { title: 1 };
    if (sortParam === "title_desc") sortOption = { title: -1 };

    const client = await clientPromise;
    const db = client.db();
    
    const skip = (page - 1) * limit;

    const [articles, totalArticles] = await Promise.all([
      db.collection("kb_articles")
        .find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("kb_articles").countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalArticles / limit);

    return NextResponse.json(
      { 
        success: true, 
        articles,
        pagination: {
          total: totalArticles,
          pages: totalPages,
          currentPage: page,
          limit
        }
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("Manager KB Fetch Error:", error);
    return NextResponse.json(
      { success: false, error: "Kesalahan internal server" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
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
    const { title, description, content, category, accessLevel, coverImage, order } = body;

    if (!title || !content || !category || !accessLevel) {
      return NextResponse.json(
        { success: false, error: "Semua field wajib diisi" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Check slug uniqueness
    let baseSlug = generateSlug(title);
    let slug = baseSlug;
    let counter = 1;
    while (await db.collection("kb_articles").findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Get category slug
    const catDoc = await db.collection("kb_categories").findOne({ name: category });
    const categorySlug = catDoc?.slug || "uncategorized";

    const newArticle = {
      slug,
      title,
      description: description || "",
      content,
      category,
      categorySlug,
      accessLevel,
      coverImage: coverImage || null,
      order: order !== undefined ? Number(order) : 0,
      authorId: session.user.discordId,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("kb_articles").insertOne(newArticle);

    // Invalidate caches immediately
    try {
      revalidatePath("/kb");
      revalidatePath(`/kb/${categorySlug}`);
      revalidatePath(`/kb/${categorySlug}/${slug}`);
      revalidatePath("/dashboard/manage/kb");
    } catch (revalErr) {
      console.error("Failed to revalidate KB path on create:", revalErr);
    }

    return NextResponse.json(
      { success: true, articleId: result.insertedId, slug },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("Manager KB Create Error:", error);
    return NextResponse.json(
      { success: false, error: "Kesalahan internal server" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
