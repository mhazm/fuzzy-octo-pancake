import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const category = searchParams.get("category");
    const categorySlug = searchParams.get("categorySlug");
    const query = searchParams.get("q") || searchParams.get("search");
    const accessLevel = searchParams.get("accessLevel");
    const includeContent = searchParams.get("includeContent") === "true";

    const client = await clientPromise;
    const db = client.db();

    // 1. Ambil spesifik artikel jika slug diberikan
    if (slug) {
      const article = await db.collection("kb_articles").findOne({ slug });

      if (!article) {
        return NextResponse.json(
          { error: `Artikel KB dengan slug '${slug}' tidak ditemukan.` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        article: {
          id: article._id.toString(),
          title: article.title,
          slug: article.slug,
          category: article.category,
          categorySlug: article.categorySlug,
          description: article.description,
          content: article.content || "",
          accessLevel: article.accessLevel,
          views: article.views || 0,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          url: `https://transport.nismara.web.id/kb/${article.categorySlug}/${article.slug}`,
        },
      });
    }

    // 2. Filter list artikel
    const filter: any = {};

    if (category) {
      filter.category = { $regex: new RegExp(`^${category}$`, "i") };
    } else if (categorySlug) {
      filter.categorySlug = categorySlug;
    }

    if (accessLevel) {
      filter.accessLevel = accessLevel;
    }

    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { tags: { $in: [new RegExp(query, "i")] } },
      ];
    }

    // Eksekusi query artikel & kategori secara paralel
    const [articles, categories] = await Promise.all([
      db
        .collection("kb_articles")
        .find(filter)
        .sort({ order: 1, createdAt: 1 })
        .toArray(),
      db
        .collection("kb_categories")
        .find({})
        .sort({ order: 1, createdAt: 1 })
        .toArray(),
    ]);

    const formattedArticles = articles.map((a) => {
      const item: any = {
        id: a._id.toString(),
        title: a.title,
        slug: a.slug,
        category: a.category,
        categorySlug: a.categorySlug,
        description: a.description,
        accessLevel: a.accessLevel,
        views: a.views || 0,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        url: `https://transport.nismara.web.id/kb/${a.categorySlug}/${a.slug}`,
      };

      if (includeContent) {
        item.content = a.content || "";
      }

      return item;
    });

    const formattedCategories = categories.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      order: c.order || 0,
      url: `https://transport.nismara.web.id/kb/${c.slug}`,
    }));

    return NextResponse.json({
      success: true,
      total: formattedArticles.length,
      categories: formattedCategories,
      articles: formattedArticles,
    });
  } catch (error) {
    console.error("GET MCP KB Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data Knowledge Base untuk MCP" },
      { status: 500 }
    );
  }
}
