import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cacheKey = "nismaraplus:supporters";
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      return NextResponse.json({
        success: true,
        data: JSON.parse(cachedData),
        cached: true,
      });
    }

    const client = await clientPromise;
    const db = client.db();

    // Fetch all users who have an active Nismara+ subscription
    const supporters = await db
      .collection("users")
      .find(
        { "nismaraplus.status": true },
        {
          projection: {
            discordId: 1,
            name: 1,
            image: 1,
            avatarUrl: 1,
            truckyId: 1,
            "nismaraplus.startedAt": 1,
          },
        }
      )
      .toArray();

    // Map and sanitize the data for public consumption
    const mappedSupporters = supporters.map((user) => ({
      discordId: user.discordId,
      name: user.name || "Unknown Driver",
      avatarUrl: user.image || user.avatarUrl || "https://ui-avatars.com/api/?name=Driver&background=random",
      truckyId: user.truckyId,
      startedAt: user.nismaraplus?.startedAt || null,
    }));

    // Sort by startedAt ascending (oldest supporters first)
    mappedSupporters.sort((a, b) => {
      const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return dateA - dateB;
    });

    // Cache the result in Redis for 1 hour (3600 seconds)
    await redis.setex(cacheKey, 3600, JSON.stringify(mappedSupporters));

    return NextResponse.json({
      success: true,
      data: mappedSupporters,
      cached: false,
    });
  } catch (error) {
    console.error("Error fetching Nismara+ supporters:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
