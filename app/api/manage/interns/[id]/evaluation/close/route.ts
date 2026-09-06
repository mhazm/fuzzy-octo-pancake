import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import DriverEvaluation from "@/lib/models/DriverEvaluation";
import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
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
    const discordId = id; // Intern's discordId

    const body = await req.json().catch(() => ({}));
    const { closeReason, evaluationNotes } = body;

    if (!closeReason || typeof closeReason !== "string" || !closeReason.trim()) {
      return NextResponse.json(
        { error: "Alasan penutupan (close reason) wajib diisi." },
        { status: 400 }
      );
    }

    if (!evaluationNotes || typeof evaluationNotes !== "string" || !evaluationNotes.trim()) {
      return NextResponse.json(
        { error: "Hasil/catatan evaluasi wajib diisi untuk referensi seluruh manajemen." },
        { status: 400 }
      );
    }

    await dbConnect();
    const client = await clientPromise;
    const db = client.db();

    // 🛡️ ATOMIC GATE: Kunci evaluasi aktif menjadi closed
    const evaluation = await DriverEvaluation.findOneAndUpdate(
      {
        driverId: discordId,
        status: "active",
      },
      {
        $set: {
          status: "closed",
          closedByManagerId: String(session.user.discordId),
          closedByManagerName: session.user.name || "Manager",
          closeReason: closeReason.trim(),
          evaluationNotes: evaluationNotes.trim(),
          closedAt: new Date(),
          kpiAwarded: true,
        },
      },
      { new: true }
    );

    if (!evaluation) {
      return NextResponse.json(
        {
          error:
            "Tidak ada sesi evaluasi aktif untuk driver ini atau sudah pernah ditutup sebelumnya.",
        },
        { status: 400 }
      );
    }

    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

    // 1. Kirim pesan notifikasi penutupan di channel Discord sebelum dihapus
    if (DISCORD_BOT_TOKEN && evaluation.channelId) {
      try {
        await fetch(
          `https://discord.com/api/v10/channels/${evaluation.channelId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `Halo <@${discordId}>, sesi evaluasi Anda telah selesai dan resmi ditutup oleh Manajer <@${session.user.discordId}>.\n\n**Alasan Penutupan:** ${closeReason.trim()}\n**Catatan Hasil:** ${evaluationNotes.trim()}\n\nChannel ini akan segera dihapus otomatis oleh sistem. Terima kasih atas kerja sama Anda!`,
            }),
          }
        );

        // 2. Hapus channel Discord
        await fetch(
          `https://discord.com/api/v10/channels/${evaluation.channelId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            },
          }
        );
      } catch (discordErr) {
        console.error("Error communicating with Discord on evaluation close:", discordErr);
        // Do not fail the request if channel is already deleted manually
      }
    }

    // 3. Notifikasi Web ke akun Driver
    await db.collection("notifications").insertOne({
      type: "info",
      title: "Evaluasi Driver Selesai",
      message: `Sesi evaluasi Anda telah diselesaikan oleh ${session.user.name || "Manager"}. Catatan: ${closeReason.trim()}`,
      recipient: discordId,
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Evaluasi berhasil diselesaikan dan dicatat (+2 Poin KPI Manager).",
        evaluation,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("POST Close Evaluation Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat menutup evaluasi" },
      { status: 500 }
    );
  }
}
