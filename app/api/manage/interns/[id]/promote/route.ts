import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const discordId = id;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const GUILD_ID = process.env.DISCORD_GUILD_ID || "863959415702028318";
    const DRIVER_ROLE_ID = process.env.DISCORD_DRIVER_ROLE_ID;
    const INTERN_ROLE_ID = process.env.DISCORD_INTERN_ROLE_ID;

    if (!DISCORD_BOT_TOKEN || !GUILD_ID || !DRIVER_ROLE_ID || !INTERN_ROLE_ID) {
      return NextResponse.json({ error: "Konfigurasi Discord API tidak lengkap" }, { status: 500 });
    }

    // Berikan Role Driver
    const addRoleRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}/roles/${DRIVER_ROLE_ID}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`
      }
    });

    if (!addRoleRes.ok && addRoleRes.status !== 204) {
      console.error("Failed to add Driver role:", await addRoleRes.text());
      return NextResponse.json({ error: "Gagal memberikan role Driver di Discord" }, { status: 500 });
    }

    // Cabut Role Intern
    const removeRoleRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}/roles/${INTERN_ROLE_ID}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`
      }
    });

    if (!removeRoleRes.ok && removeRoleRes.status !== 204) {
      console.error("Failed to remove Intern role:", await removeRoleRes.text());
      // Tetap sukseskan secara parsial karena role driver sudah masuk
    }

    let amnestiedPoints = 0;

    // Catat riwayat promosi ke MongoDB untuk audit & perhitungan performa KPI manager
    try {
      const client = await clientPromise;
      const db = client.db();

      const latestQuiz = await db
        .collection("quizattempts")
        .findOne({ discordId }, { sort: { createdAt: -1 } });

      await db.collection("internpromotions").insertOne({
        internDiscordId: discordId,
        managerId: String(session.user.discordId),
        managerName: session.user.name || "Manager",
        quizScore: latestQuiz?.score ?? null,
        promotedAt: new Date(),
        createdAt: new Date(),
      });

      await db.collection("users").updateOne(
        { discordId },
        {
          $set: {
            isDriver: true,
            promotedBy: String(session.user.discordId),
            promotedAt: new Date(),
          },
          $unset: {
            isInterviewing: "",
            interviewChannelId: "",
          },
        }
      );

      // 🛡️ AMNESTI POIN PENALTI: Reset totalPoints ke 0
      const pointDoc = await db.collection("points").findOne({
        userId: discordId,
        guildId: GUILD_ID,
      });

      const currentPoints = pointDoc?.totalPoints || 0;
      amnestiedPoints = currentPoints;

      if (currentPoints > 0) {
        await db.collection("points").updateOne(
          { userId: discordId, guildId: GUILD_ID },
          {
            $set: {
              totalPoints: 0,
              updatedAt: new Date(),
            },
          }
        );

        // Catat mutasi amnesti poin ke pointhistories
        await db.collection("pointhistories").insertOne({
          guildId: GUILD_ID,
          userId: discordId,
          managerId: String(session.user.discordId),
          points: currentPoints,
          type: "remove",
          reason: `Amnesti Poin: Kelulusan & Promosi dari Magang ke Driver Resmi (Poin sebelumnya: ${currentPoints})`,
          createdAt: new Date(),
        });
      } else if (!pointDoc) {
        // Inisialisasi record jika belum ada
        await db.collection("points").insertOne({
          userId: discordId,
          guildId: GUILD_ID,
          totalPoints: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Notifikasi Web ke Akun Driver
      await db.collection("notifications").insertOne({
        type: "success",
        title: "Selamat atas Promosi Driver! 🎉",
        message: `Anda resmi dipromosikan menjadi Driver Nismara Transport oleh ${session.user.name || "Manager"}.${currentPoints > 0 ? ` Anda juga mendapatkan amnesti poin (${currentPoints} poin penalti dihapus menjadi 0).` : ""}`,
        recipient: discordId,
        readBy: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Invalidate Redis profile cache jika tersedia
      try {
        const { redis } = await import("@/lib/redis");
        if (redis) {
          const u = await db.collection("users").findOne({ discordId });
          if (u?._id) {
            await redis.del(`session:profile:${u._id.toString()}`);
          }
        }
      } catch {
        // Redis optional
      }
    } catch (dbErr) {
      console.error("Gagal mencatat data promosi/amnesti ke MongoDB:", dbErr);
    }

    const amnestyNote = amnestiedPoints > 0
      ? ` Seluruh ${amnestiedPoints} poin penalti telah diberikan amnesti (direset menjadi 0).`
      : " (Poin penalti saat ini: 0).";

    return NextResponse.json({
      success: true,
      message: `Intern berhasil dipromosikan menjadi Sopir!${amnestyNote}`,
      pointsAmnestied: amnestiedPoints,
    });
  } catch (error) {
    console.error("POST Promote Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
