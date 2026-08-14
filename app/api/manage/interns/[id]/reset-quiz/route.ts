import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import QuizAttempt from "@/lib/models/QuizAttempt";
import dbConnect from "@/lib/mongoose";
import clientPromise from "@/lib/mongodb";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !session.user ||
      (session.user.role !== "manager" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const discordId = id; // The ID passed is the discordId of the intern
    
    await dbConnect();

    // Hapus semua riwayat ujian untuk intern ini
    await QuizAttempt.deleteMany({ discordId });

    // Berikan kembali akses ujian ke user
    const client = await clientPromise;
    const db = client.db();
    await db.collection("users").updateOne(
      { discordId },
      { $set: { isInterviewing: true } }
    );

    return NextResponse.json({
      success: true,
      message: "Kesempatan ujian berhasil direset. Intern sekarang dapat mengulang ujian kembali.",
    });
  } catch (error) {
    console.error("POST Reset Quiz Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 },
    );
  }
}
