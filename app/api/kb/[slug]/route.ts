import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

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

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";
    const isDriver = session?.user?.isDriver === true;

    // Determine allowed access levels based on session
    const allowedAccess = ["public"];
    if (isDriver || isManager) allowedAccess.push("driver");
    if (isManager) allowedAccess.push("manager");

    const client = await clientPromise;
    const db = client.db();

    // Await params for Next.js 15+
    const resolvedParams = await params;
    const resolvedSlug = resolvedParams.slug;

    const article = await db.collection("kb_articles").findOne({ slug: resolvedSlug });

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Artikel tidak ditemukan" },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // Check permissions
    if (!allowedAccess.includes(article.accessLevel)) {
      return NextResponse.json(
        { success: false, error: "Akses ditolak" },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Increment view count asynchronously
    db.collection("kb_articles").updateOne({ _id: article._id }, { $inc: { views: 1 } }).catch(console.error);

    // Fetch related articles (same category, ordered by creation date)
    const categoryArticles = await db.collection("kb_articles")
      .find({ category: article.category, accessLevel: { $in: allowedAccess } })
      .sort({ createdAt: 1 })
      .project({ title: 1, slug: 1, categorySlug: 1, description: 1 })
      .toArray();

    let prevArticle = null;
    let nextArticle = null;

    const currentIndex = categoryArticles.findIndex(a => a._id.toString() === article._id.toString());
    
    if (currentIndex > 0) prevArticle = categoryArticles[currentIndex - 1];
    if (currentIndex < categoryArticles.length - 1) nextArticle = categoryArticles[currentIndex + 1];

    // Pick up to 3 related articles (excluding the current one)
    const relatedArticles = categoryArticles.filter(a => a._id.toString() !== article._id.toString()).slice(0, 3);

    return NextResponse.json(
      { success: true, article, prevArticle, nextArticle, relatedArticles },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error: any) {
    console.error("KB Fetch Slug Error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan sistem" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
