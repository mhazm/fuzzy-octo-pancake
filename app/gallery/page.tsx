import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import GalleryIndexClient from "./GalleryIndexClient";
import { Grid3X3 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Galeri",
  description:
    "Kumpulan foto perjalanan, armada, dan momen terbaik dari komunitas driver Nismara Transport.",
  openGraph: {
    title: "Galeri",
    description:
      "Jelajahi karya visual dan dokumentasi konvoi dari ratusan driver Nismara Transport.",
    type: "website",
  },
};

export default async function GlobalGalleryPage() {
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

    // Fetch initial data (limit 12) server-side for fast rendering
    const pipeline: any[] = [
      { $sort: { createdAt: -1 } },
      { $limit: 12 },
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
            isBooster: "$uploader.isBooster",
            role: "$uploader.discordRole"
          },
        },
      },
      {
        $project: {
          uploader: 0,
        },
      },
    ];

    const initialPostsRaw = await db
      .collection("gallery_posts")
      .aggregate(pipeline)
      .toArray();

    // Serialize ObjectIds for Client Component
    const initialPosts = initialPostsRaw.map((post) => ({
      ...post,
      _id: post._id.toString(),
    }));

    return (
      <main className="min-h-screen bg-background pb-20">
        <div className="pt-24 pb-8 md:pt-32 md:pb-12 bg-card/30 border-b border-border/50 relative overflow-hidden">
          {/* Background Decorative */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-40 bg-primary/20 blur-[100px] rounded-full opacity-50 pointer-events-none" />

          <div className="container mx-auto px-4 relative z-10 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] mb-4">
              <Grid3X3 className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground uppercase tracking-wider mb-4">
              Galeri{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
                Nismara
              </span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Jelajahi karya visual, dokumentasi perjalanan, dan momen terbaik
              yang dibagikan oleh seluruh anggota Nismara Transport.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <GalleryIndexClient
            initialPosts={initialPosts}
            loggedInDiscordId={loggedInDiscordId}
            loggedInUserTruckyId={loggedInUserTruckyId}
            isManager={isManager}
          />
        </div>
      </main>
    );
  } catch (error) {
    console.error("Error loading global gallery:", error);
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">
            Gagal Memuat Galeri
          </h1>
          <p className="text-muted-foreground">Silakan coba lagi nanti.</p>
        </div>
      </main>
    );
  }
}
