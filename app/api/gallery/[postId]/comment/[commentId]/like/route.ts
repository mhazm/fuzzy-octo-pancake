import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId, commentId } = await params;
    const client = await clientPromise;
    const db = client.db();
    const userDiscordId = session.user.id || session.user.discordId;

    if (!ObjectId.isValid(postId) || !ObjectId.isValid(commentId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const comment = await db.collection("gallery_comments").findOne({
      _id: new ObjectId(commentId),
      postId: new ObjectId(postId),
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const likes = comment.likes || [];
    const userHasLiked = likes.includes(userDiscordId);

    if (userHasLiked) {
      // Unlike
      await db.collection("gallery_comments").updateOne(
        { _id: new ObjectId(commentId) },
        { $pull: { likes: userDiscordId } as any }
      );
      return NextResponse.json({ success: true, liked: false });
    } else {
      // Like
      await db.collection("gallery_comments").updateOne(
        { _id: new ObjectId(commentId) },
        { $addToSet: { likes: userDiscordId } as any }
      );
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error("Error toggling comment like:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
