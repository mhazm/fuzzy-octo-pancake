import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uri: string }> }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || (user.role !== "manager" && user.role !== "admin" && user.discordRole !== "manager" && user.discordRole !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uri } = await params;
  const client = await clientPromise;
  const db = client.db();

  // Cek apakah survey ada
  const survey = await db.collection("surveys").findOne({ uri });
  if (!survey) {
    return NextResponse.json({ error: "Survey tidak ditemukan" }, { status: 404 });
  }

  // Hapus survey dan semua responsenya sekaligus
  await Promise.all([
    db.collection("surveys").deleteOne({ uri }),
    db.collection("survey_responses").deleteMany({ surveyUri: uri }),
  ]);

  return NextResponse.json({ success: true });
}
