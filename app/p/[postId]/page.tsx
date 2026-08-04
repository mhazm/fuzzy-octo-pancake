import { Metadata } from "next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import PostDetailClient from "@/components/gallery/PostDetailClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import { ArrowLeft, MonitorPlay } from "lucide-react";

export async function generateMetadata(props: { params: Promise<{ postId: string }> }): Promise<Metadata> {
  const { postId } = await props.params;

  try {
    const client = await clientPromise;
    const db = client.db();
    const post = await db.collection("gallery_posts").findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return { title: "Postingan tidak ditemukan" };
    }

    const user = await db.collection("users").findOne({ discordId: post.userId });
    const title = user?.name ? `Postingan Truk dari ${user.name}` : "Galeri Truk Nismara";
    const desc = post.caption || "Lihat koleksi foto perjalanan dan armada kebanggaan di Nismara Logistics.";

    return {
      title,
      description: desc,
      openGraph: {
        title,
        description: desc,
        images: [post.imageUrl],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: desc,
        images: [post.imageUrl],
      },
    };
  } catch (error) {
    return { title: "Galeri Truk" };
  }
}

export default async function PostPage(props: { params: Promise<{ postId: string }> }) {
  const { postId } = await props.params;
  const session = await getServerSession(authOptions);
  const loggedInDiscordId = session?.user?.id || session?.user?.discordId || "";
  const isManager = session?.user?.role === "manager" || session?.user?.role === "admin";

  let post = null;
  let profileUser = null;
  let enrichedComments = [];
  let loggedInUserTruckyId = null;

  try {
    const client = await clientPromise;
    const db = client.db();
    
    if (loggedInDiscordId) {
      const me = await db.collection("users").findOne({ discordId: loggedInDiscordId });
      loggedInUserTruckyId = me?.truckyId || null;
    }

    post = await db.collection("gallery_posts").findOne({ _id: new ObjectId(postId) });
    
    if (post) {
      profileUser = await db.collection("users").findOne({ discordId: post.userId });
      
      const comments = await db.collection("gallery_comments")
        .find({ postId: new ObjectId(postId) })
        .sort({ createdAt: 1 })
        .toArray();
        
      const userIds = [...new Set(comments.map(c => c.userId))];
      const users = await db.collection("users")
        .find({ discordId: { $in: userIds } })
        .project({ discordId: 1, name: 1, image: 1, avatarUrl: 1, truckyId: 1, nismaraplus: 1, isBooster: 1 })
        .toArray();

      const userMap = users.reduce((acc, user) => {
        acc[user.discordId] = {
          ...user,
          avatarUrl: user.image || user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=random`,
          isNismaraPlus: user.nismaraplus?.status === true,
          isBooster: user.isBooster === true
        };
        return acc;
      }, {} as Record<string, any>);

      enrichedComments = comments.map(c => {
        const u = userMap[c.userId] || { name: "Unknown", avatarUrl: null };
        const commentObj = { 
          ...c, 
          user: {
            name: u.name,
            avatarUrl: u.avatarUrl,
            truckyId: u.truckyId,
            isNismaraPlus: u.isNismaraPlus,
            isBooster: u.isBooster
          }  
        };
        // Serialize ObjectId to string for client component
        return JSON.parse(JSON.stringify(commentObj));
      });

      // Serialize post ObjectId
      post = JSON.parse(JSON.stringify(post));
    }
  } catch (error) {
    console.error(error);
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
        <div className="max-w-md w-full px-6 py-16 bg-card/40 backdrop-blur-sm border border-border/50 rounded-3xl shadow-2xl text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <MonitorPlay className="w-12 h-12 text-muted-foreground/50" />
          </div>
          <h1 className="text-3xl font-black text-foreground mb-4">Postingan tidak ditemukan</h1>
          <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
            Tautan yang Anda ikuti mungkin rusak, atau postingan telah dihapus oleh pemiliknya.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-primary/90 transition w-full sm:w-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            Kembali ke Beranda
          </Link>
        </div>
      </main>
    );
  }

  const profileName = profileUser?.name || "Driver Nismara";
  const profileAvatar = profileUser?.image || profileUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=random`;
  const profileTruckyId = profileUser?.truckyId || "";

  return (
    <>
        <PostDetailClient 
          post={post}
          initialComments={enrichedComments}
          loggedInUserId={String(loggedInDiscordId || "")}
          loggedInUserTruckyId={loggedInUserTruckyId ? String(loggedInUserTruckyId) : null}
          profileName={profileUser?.name || "Driver"}
          profileAvatar={profileUser?.image || profileUser?.avatarUrl || "/placeholder-avatar.png"}
          profileTruckyId={profileUser?.truckyId || ""}
          profileIsNismaraPlus={profileUser?.nismaraplus?.status === true}
          profileIsBooster={profileUser?.isBooster === true}
          profileRole={profileUser?.role || "user"}
          isManager={isManager}
        />
    </>
  );
}
