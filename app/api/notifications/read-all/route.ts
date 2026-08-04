import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import Notification from "@/lib/models/Notification";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const discordId = session.user.discordId;

    // Find all notifications for this user that are not read yet
    const unreadNotifications = await Notification.find({
      $or: [{ recipient: discordId }, { recipient: "global" }],
      readBy: { $ne: discordId },
    });

    // Mark them all as read
    const updatePromises = unreadNotifications.map(async (notif) => {
      notif.readBy.push(discordId);
      return notif.save();
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, count: unreadNotifications.length });
  } catch (error: any) {
    console.error("Notifications Read-All Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
