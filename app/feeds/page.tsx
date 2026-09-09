import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import FeedsClient from "./FeedsClient";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feeds Linimasa Komunitas Driver",
  description:
    "Linimasa sosial resmi Nismara Transport. Lihat update aktivitas, pengiriman kargo terbaru, dan interaksi seru antar pengemudi.",
  openGraph: {
    title: "Feeds Linimasa Komunitas Driver",
    description:
      "Linimasa sosial resmi Nismara Transport. Lihat update aktivitas, pengiriman kargo terbaru, dan interaksi seru antar pengemudi.",
    url: "https://transport.nismara.web.id/feeds",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Feeds Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Feeds Linimasa Komunitas Driver",
    description:
      "Linimasa sosial resmi Nismara Transport. Lihat update aktivitas dan pengiriman kargo rekan pengemudi.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
};

export default async function GlobalFeedsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const loggedInDiscordId = String(session?.user?.id || session?.user?.discordId || "");
  const isManager =
    session?.user?.role === "manager" || session?.user?.role === "admin";

  let loggedInUserTruckyId = null;

  try {
    const client = await clientPromise;
    const db = client.db();

    if (loggedInDiscordId) {
      const me = await db
        .collection("users")
        .findOne({ discordId: loggedInDiscordId });
      loggedInUserTruckyId = me?.truckyId || null;
    }

    const resolvedSearchParams = await searchParams;
    const currentTag = typeof resolvedSearchParams?.tag === "string" ? resolvedSearchParams.tag : undefined;

    // Fetch initial data (limit 10 for feeds) server-side for fast rendering
    const pipeline: any[] = [];
    if (currentTag) {
      pipeline.push({ $match: { tags: currentTag } });
    }
    
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "gallery_comments",
          localField: "_id",
          foreignField: "postId",
          as: "comments",
        },
      },
      {
        $addFields: {
          commentCount: { $size: "$comments" },
        },
      },
      {
        $project: {
          comments: 0,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "discordId",
          as: "uploader",
        },
      },
      {
        $unwind: {
          path: "$uploader",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          user: {
            name: "$uploader.name",
            avatarUrl: { $ifNull: ["$uploader.image", "$uploader.avatarUrl"] },
            truckyId: "$uploader.truckyId",
            isNismaraPlus: "$uploader.nismaraplus.status",
            nismaraPlusStartedAt: "$uploader.nismaraplus.startedAt",
            isBooster: "$uploader.isBooster",
            role: "$uploader.discordRole",
            truckyRank: "$uploader.truckyRank",
            topManager: "$uploader.topManager"
          },
        },
      },
      {
        $project: {
          uploader: 0,
        },
      }
    );

    const initialPostsRaw = await db
      .collection("gallery_posts")
      .aggregate(pipeline)
      .toArray();

    // Fetch trending tags
    const trendingTagsRaw = await db.collection("gallery_posts").aggregate([
      { $unwind: "$tags" },
      { $match: { tags: { $exists: true, $ne: "" } } },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    const trendingTags = trendingTagsRaw.map(t => ({
      tag: t._id,
      count: t.count
    }));

    // Serialize ObjectIds for Client Component
    const initialPosts = initialPostsRaw.map((post) => ({
      ...post,
      _id: post._id.toString(),
    }));

    return (
      <main className="min-h-screen bg-background pb-20">
        {/* Simple Header */}
        <div className="pt-24 pb-4 md:pt-32 md:pb-4 bg-background border-b border-border/50 sticky top-0 z-40 backdrop-blur-md bg-background/80">
          <div className="container mx-auto px-4 lg:max-w-6xl flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span>Feeds</span>
              {currentTag ? (
                <span className="text-primary ml-1 text-xl">#{currentTag}</span>
              ) : (
                <Sparkles className="w-5 h-5 text-primary" />
              )}
            </h1>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 lg:max-w-6xl">
          <FeedsClient
            initialPosts={initialPosts}
            trendingTags={trendingTags}
            currentTag={currentTag}
            loggedInDiscordId={loggedInDiscordId}
            loggedInUserTruckyId={loggedInUserTruckyId}
            isManager={isManager}
          />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Error loading feeds:", error);
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">
            Gagal Memuat Feeds
          </h1>
          <p className="text-muted-foreground">Silakan coba lagi nanti.</p>
        </div>
      </main>
    );
  }
}
