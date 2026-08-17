import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Notification from "@/lib/models/Notification";

import dbConnect from "@/lib/mongoose";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const discordId = session.user.discordId;

    // 1. Delete all personal notifications for this user
    await Notification.deleteMany({ recipient: discordId });

    // 2. Hide (soft-delete) all global notifications for this user
    await Notification.updateMany(
      { recipient: "global", deletedBy: { $ne: discordId } },
      { $push: { deletedBy: discordId } },
      { strict: false }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Notifications Delete-All Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
