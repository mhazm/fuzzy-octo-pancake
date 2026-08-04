import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Fleet from "@/lib/models/Fleet";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

import dbConnect from "@/lib/mongoose";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;

    // We need to find the user ObjectId
    const db = mongoose.connection.useDb(mongoose.connection.name);
    const user = await db
      .collection("users")
      .findOne({ discordId: session.user.discordId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. Find the Fleet
    const fleet = await Fleet.findOne({ id: id });
    if (!fleet) {
      return NextResponse.json(
        { error: "Kendaraan tidak ditemukan" },
        { status: 404 },
      );
    }

    // 2. Check Ownership
    if (String(fleet.owner) !== String(user._id)) {
      return NextResponse.json(
        {
          error:
            "Akses ditolak. Anda bukan pemilik (owner) dari kendaraan ini.",
        },
        { status: 403 },
      );
    }

    // 3. Toggle Assignment
    let message = "";
    if (fleet.driver) {
      // Unassign
      fleet.driver = null;
      message = "Berhasil melepaskan (unassign) kendaraan.";
    } else {
      // Assign back to owner
      fleet.driver = user._id;
      message = "Berhasil menugaskan kembali (assign) kendaraan kepada Anda.";
    }

    await fleet.save();

    return NextResponse.json({ success: true, message: message, data: fleet });
  } catch (error) {
    console.error("POST Fleet Toggle Driver Error:", error);
    return NextResponse.json(
      { error: "Gagal memproses permintaan" },
      { status: 500 },
    );
  }
}
