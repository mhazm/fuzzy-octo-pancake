import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId"); // Discord ID
    const isGlobal = searchParams.get("global") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 12;
    const skip = (page - 1) * limit;

    if (!userId && !isGlobal) {
      return NextResponse.json({ error: "userId required or global=true" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    const pipeline: any[] = [];
    
    if (userId) {
      pipeline.push({ $match: { userId } });
    }
    
    pipeline.push({ $sort: { createdAt: -1 } });
    
    if (isGlobal) {
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit }); // Pagination limit
    }
    
    pipeline.push(
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
        }
    );

    if (isGlobal) {
      // Lookup ke tabel users untuk mendapatkan detail uploader
      pipeline.push(
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
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $addFields: {
            user: {
              name: "$uploader.name",
              avatarUrl: { $ifNull: ["$uploader.image", "$uploader.avatarUrl"] },
              truckyId: "$uploader.truckyId",
              isNismaraPlus: "$uploader.nismaraplus.status",
              isBooster: "$uploader.isBooster",
              role: "$uploader.discordRole",
              truckyRank: "$uploader.truckyRank"
            }
          }
        },
        {
          $project: {
            uploader: 0
          }
        }
      );
    }

    const posts = await db.collection("gallery_posts").aggregate(pipeline).toArray();

    return NextResponse.json(posts, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=240",
      },
    });
  } catch (error) {
    console.error("Error fetching gallery posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery posts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageUrl, imageUrls, caption } = await request.json();

    // For backward compatibility, allow either imageUrl or imageUrls
    const finalImageUrls = imageUrls || (imageUrl ? [imageUrl] : []);
    const mainImageUrl = finalImageUrls[0];

    if (!mainImageUrl) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db();
    const userDiscordId = session.user.id || session.user.discordId;

    const user = await db.collection("users").findOne({ discordId: userDiscordId });
    if (user?.galleryBan?.status) {
      if (!user.galleryBan.expiredAt || new Date(user.galleryBan.expiredAt) > new Date()) {
        const reason = user.galleryBan.reason ? `Reason: ${user.galleryBan.reason}` : "";
        return NextResponse.json(
          { error: `You are banned from uploading to the gallery. ${reason}` },
          { status: 403 }
        );
      } else {
        // Ban expired, clean it up
        await db.collection("users").updateOne(
          { discordId: userDiscordId },
          { $set: { "galleryBan.status": false } }
        );
      }
    }

    const newPost = {
      userId: userDiscordId,
      imageUrl: mainImageUrl, // store the first image for backward compat
      imageUrls: finalImageUrls, // store all images
      caption: caption || "",
      likes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("gallery_posts").insertOne(newPost);

    return NextResponse.json({ ...newPost, _id: result.insertedId });
  } catch (error) {
    console.error("Error creating gallery post:", error);
    return NextResponse.json(
      { error: "Failed to create gallery post" },
      { status: 500 },
    );
  }
}
