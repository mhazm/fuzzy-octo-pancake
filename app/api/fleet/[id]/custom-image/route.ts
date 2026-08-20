import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import Fleet from "@/lib/models/Fleet";
import { deleteFileFromR2 } from "@/lib/r2";

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
    let { customImage } = body; // This should be a URL string or null

    const client = await clientPromise;
    const db = client.db();

    // Get user
    const user = await db.collection("users").findOne({ discordId: session.user.discordId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is the owner of the fleet
    const fleet = await Fleet.findOne({ id: id });
    if (!fleet) {
      return NextResponse.json({ error: "Truk tidak ditemukan" }, { status: 404 });
    }

    if (String(fleet.owner) !== String(user._id)) {
      return NextResponse.json(
        { error: "Hanya pemilik truk yang bisa mengganti gambar kustom" },
        { status: 403 },
      );
    }

    // If changing the image and an old custom image exists, delete the old one from R2
    if (fleet.customImage && fleet.customImage !== customImage) {
      await deleteFileFromR2(fleet.customImage);
    }

    fleet.customImage = customImage || null;
    await fleet.save();

    return NextResponse.json({
      success: true,
      message: "Gambar kustom berhasil disimpan",
      customImage: fleet.customImage
    });
  } catch (error: any) {
    console.error("Error setting custom image:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
