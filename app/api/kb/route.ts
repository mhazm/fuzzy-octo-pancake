import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
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
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const filter: any = {
      accessLevel: { $in: allowedAccess }
    };

    if (category && category !== "Semua") {
      filter.category = category;
    }

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const articles = await db.collection("kb_articles")
      .find(filter)
      .sort({ order: 1, createdAt: 1 })
      .project({ content: 0 }) // Do not fetch full markdown content for the list
      .toArray();

    const categories = await db.collection("kb_categories")
      .find()
      .sort({ order: 1, createdAt: 1 })
      .toArray();

    return NextResponse.json({ success: true, articles, categories });
  } catch (error: any) {
    console.error("KB Fetch Error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data KB" }, { status: 500 });
  }
}
