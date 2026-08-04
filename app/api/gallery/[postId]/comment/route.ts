import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const client = await clientPromise;
    const db = client.db();

    // Fetch comments and populate user info manually (MongoDB aggregate or manual join)
    const comments = await db.collection("gallery_comments")
      .find({ postId: new ObjectId(postId) })
      .sort({ createdAt: 1 })
      .toArray();

    // Fetch user details for each comment
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

    const enrichedComments = comments.map(c => {
      const u = userMap[c.userId] || { name: "Unknown", avatarUrl: null };
      return {
        ...c,
        user: {
          name: u.name,
          avatarUrl: u.avatarUrl,
          truckyId: u.truckyId,
          isNismaraPlus: u.isNismaraPlus,
          isBooster: u.isBooster
        }
      };
    });

    return NextResponse.json(enrichedComments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

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
    const { text } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const userDiscordId = session.user.id || session.user.discordId;

    // Fetch the user to verify if they are a driver
    const user = await db.collection("users").findOne({ discordId: userDiscordId });
    if (!user || !user.truckyId) {
      return NextResponse.json({ error: "Hanya driver Nismara yang dapat berkomentar" }, { status: 403 });
    }

    const newComment = {
      postId: new ObjectId(postId),
      userId: userDiscordId,
      text: text.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("gallery_comments").insertOne(newComment);
    
    const enrichedNewComment = {
      ...newComment,
      _id: result.insertedId,
      user: {
        name: user.name || session.user.name || "You",
        avatarUrl: user.image || user.avatarUrl || session.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.name || "You")}&background=random`,
        truckyId: user.truckyId,
        isNismaraPlus: user.nismaraplus?.status === true,
        isBooster: user.isBooster === true
      }
    };

    return NextResponse.json(enrichedNewComment);
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
