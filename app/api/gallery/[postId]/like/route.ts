import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sendPersonalNotification } from "@/lib/services/NotificationService";
import { redis } from "@/lib/redis";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId } = await params;
    const client = await clientPromise;
    const db = client.db();
    const userDiscordId = session.user.id || session.user.discordId;

    const post = await db.collection("gallery_posts").findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const likes = post.likes || [];
    const hasLiked = likes.includes(userDiscordId);

    if (hasLiked) {
      // Unlike
      await db.collection("gallery_posts").updateOne(
        { _id: new ObjectId(postId) },
        { $pull: { likes: userDiscordId } as any }
      );
    } else {
      // Like
      await db.collection("gallery_posts").updateOne(
        { _id: new ObjectId(postId) },
        { $push: { likes: userDiscordId } as any }
      );

      // Notification with Redis cooldown
      if (post.userId && post.userId !== userDiscordId) {
        const cooldownKey = `cooldown:notification:like:${postId}:${userDiscordId}`;
        const isOnCooldown = await redis.get(cooldownKey);

        if (!isOnCooldown) {
          const userName = session.user.name || "Seseorang";
          sendPersonalNotification(
            post.userId,
            "Postingan Disukai",
            `${userName} menyukai postingan galeri Anda.`,
            "info",
            `/p/${postId}`
          ).catch((err) => console.error("Failed to send notification:", err));

          // Set cooldown for 1 hour (3600 seconds) to prevent spam
          await redis.set(cooldownKey, "1", "EX", 3600);
        }
      }
    }

    return NextResponse.json({ success: true, liked: !hasLiked });
  } catch (error) {
    console.error("Error toggling like:", error);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
