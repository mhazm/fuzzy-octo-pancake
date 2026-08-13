import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function DELETE(
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

    const userSession = session.user as any;
    const isManager = session.user.role === "manager" || session.user.role === "admin" || userSession.discordRole === "manager" || userSession.discordRole === "admin";
    const isOwner = comment.userId === userDiscordId;

    if (!isOwner && !isManager) {
      return NextResponse.json({ error: "Forbidden: You cannot delete this comment" }, { status: 403 });
    }

    // Delete the comment
    await db.collection("gallery_comments").deleteOne({ _id: new ObjectId(commentId) });
    
    // Optional: Delete replies to this comment
    await db.collection("gallery_comments").deleteMany({ parentId: new ObjectId(commentId) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { postId, commentId } = await params;
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

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

    const isOwner = comment.userId === userDiscordId;

    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden: You cannot edit this comment" }, { status: 403 });
    }

    await db.collection("gallery_comments").updateOne(
      { _id: new ObjectId(commentId) },
      { $set: { text: text.trim(), updatedAt: new Date() } }
    );

    return NextResponse.json({ success: true, text: text.trim() });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}
