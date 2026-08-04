import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import Notification from "@/lib/models/Notification";

import dbConnect from "@/lib/mongoose";
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const discordId = session.user.discordId;

    // Get notifications for this user OR global notifications, sorting by newest first.
    // We get all unexpired (handled by MongoDB TTL) notifications.
    const notifications = await Notification.find({
      $or: [
        { recipient: discordId },
        { recipient: "global" }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(50) // Max 50 notifications fetched to keep it light
    .lean();

    // Attach an `isRead` flag to easily parse in frontend
    const mapped = notifications.map((n: any) => ({
      ...n,
      isRead: n.readBy && n.readBy.includes(discordId)
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    console.error("Notifications GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
