import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import SecurityAlert from "@/lib/models/SecurityAlert";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Strictly check for ADMIN or MANAGER role
    if (session.user.role !== "admin" && session.user.role !== "manager") {
      return NextResponse.json({ error: "Forbidden - Manager or Admin only" }, { status: 403 });
    }

    await clientPromise;

    // Fetch the latest 50 security alerts
    const alerts = await SecurityAlert.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error("Fetch Security Alerts Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch security alerts" },
      { status: 500 }
    );
  }
}
