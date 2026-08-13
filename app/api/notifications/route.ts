import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import Notification from "@/lib/models/Notification";

import dbConnect from "@/lib/mongoose";
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const discordId = session.user.discordId;

    // Get notifications for this user OR global notifications, sorting by newest first.
    // We get all unexpired (handled by MongoDB TTL) notifications.
    const query = {
      $or: [
        { recipient: discordId },
        { recipient: "global" }
      ]
    };

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query)
    ]);

    // Attach an `isRead` flag to easily parse in frontend
    const mapped = notifications.map((n: any) => ({
      ...n,
      isRead: n.readBy && n.readBy.includes(discordId)
    }));

    return NextResponse.json({ 
      success: true, 
      data: mapped,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error("Notifications GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
