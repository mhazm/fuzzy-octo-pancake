import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import Fleet from "@/lib/models/Fleet";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    let { customName } = body;

    // Validate
    if (customName && customName.length > 30) {
      return NextResponse.json(
        { error: "Nama truk maksimal 30 karakter" },
        { status: 400 },
      );
    }
    
    if (!customName || customName.trim() === "") {
        customName = null;
    } else {
        customName = customName.trim();
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user
    const user = await db.collection("users").findOne({ discordId: session.user.discordId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is the owner of the fleet
    // We are looking up by truckyId (id) or ObjectId (_id)? 
    // The route is usually /api/fleet/[id]/... where id is the Trucky ID (string). Let's use id.
    const fleet = await Fleet.findOne({ id: id });
    if (!fleet) {
      return NextResponse.json({ error: "Truk tidak ditemukan" }, { status: 404 });
    }

    if (String(fleet.owner) !== String(user._id)) {
      return NextResponse.json(
        { error: "Hanya pemilik truk yang bisa mengganti nama kustom" },
        { status: 403 },
      );
    }

    fleet.customName = customName;
    await fleet.save();

    return NextResponse.json({
      success: true,
      message: "Nama kustom berhasil disimpan",
      customName: customName
    });
  } catch (error: any) {
    console.error("Error setting custom name:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
