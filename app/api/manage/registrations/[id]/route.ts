import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { action, guildId, editData } = await req.json();

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const regId = new ObjectId(id);

    // ACTION 1: HANYA UPDATE DATA (Tanpa Approve)
    if (action === "update") {
      await db.collection("registrations").updateOne(
        { _id: regId },
        {
          $set: {
            truckyId: editData.truckyId,
            reason: editData.reason,
            experience: editData.experience,
            updatedAt: new Date(),
          },
        },
      );
      return NextResponse.json({ success: true, message: "Data updated" });
    }

    // ACTION 2: CLAIM
    if (action === "claim") {
      const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

      // Find the registration first to get the channel ID
      const registration = await db
        .collection("registrations")
        .findOne({ _id: regId });

      await db.collection("registrations").updateOne(
        { _id: regId },
        {
          $set: { managerId: session.user.discordId, updatedAt: new Date() },
        },
      );

      // Send discord notification if we have the token and channel
      if (registration && registration.discordChannelId && DISCORD_BOT_TOKEN) {
        await fetch(
          `https://discord.com/api/v10/channels/${registration.discordChannelId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `Halo <@${registration.userId}>!`,
              embeds: [
                {
                  title: "👋 Pendaftaran Sedang Diproses",
                  description: `Pendaftaran Anda telah diambil alih oleh Manager <@${session.user.discordId}>.\n\nMohon merespon pesan atau arahan yang diberikan oleh Manager untuk mempercepat proses pendaftaran Anda.`,
                  color: 16753920, // Orange
                  footer: { text: "Nismara Transport HR" },
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
          },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Claimed successfully",
      });
    }

    // ==============================================================
    // MANUAL OVERRIDES (FORCE APPROVE & REJECT)
    // ==============================================================
    if (action === "approve" || action === "reject") {
      const registration = await db
        .collection("registrations")
        .findOne({ _id: regId });
      if (!registration)
        return NextResponse.json({ error: "Not found" }, { status: 404 });

      const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
      const GUILD_ID = process.env.DISCORD_GUILD_ID;
      const INTERN_ROLE_ID = process.env.DISCORD_INTERN_ROLE_ID;

      // Hapus channel pendaftaran
      if (registration.discordChannelId && DISCORD_BOT_TOKEN) {
        await fetch(
          `https://discord.com/api/v10/channels/${registration.discordChannelId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
          },
        ).catch((e) => console.error(e));
      }

      if (action === "approve") {
        const truckyId = parseInt(editData.truckyId || registration.truckyId);

        // 1. Update status
        await db
          .collection("registrations")
          .updateOne(
            { _id: regId },
            { $set: { status: "approved", truckyId, updatedAt: new Date() } },
          );

        // 2. Add to driverlinks
        await db.collection("driverlinks").updateOne(
          { userId: registration.userId },
          {
            $set: {
              guildId: GUILD_ID,
              userId: registration.userId,
              truckyId: truckyId,
              truckyName: registration.username,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true },
        );

        // 3. Create/update in users
        await db.collection("users").updateOne(
          {
            $or: [
              { discordId: registration.userId },
              { id: registration.userId },
            ],
          },
          {
            $set: {
              discordId: registration.userId,
              truckyId: truckyId,
              isDriver: true,
              updatedAt: new Date(),
            },
          },
          { upsert: true },
        );

        // 4. Assign intern role & send DM
        if (DISCORD_BOT_TOKEN) {
          if (INTERN_ROLE_ID && GUILD_ID) {
            await fetch(
              `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${registration.userId}/roles/${INTERN_ROLE_ID}`,
              {
                method: "PUT",
                headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
              },
            );
          }

          try {
            const res = await fetch(
              `https://discord.com/api/v10/users/@me/channels`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ recipient_id: registration.userId }),
              },
            );
            if (res.ok) {
              const dmChannel = await res.json();
              await fetch(
                `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    content: `Halo <@${registration.userId}>,`,
                    embeds: [
                      {
                        title: "🎉 SELAMAT! Lamaran Anda Diterima",
                        description:
                          "Lamaran Anda ke VTC Nismara Transport telah **DITERIMA**. Anda sekarang resmi menjadi Intern kami. Silakan kembali ke server Discord, role Anda telah kami sesuaikan!",
                        color: 3066993, // Green
                        thumbnail: {
                          url: "https://images.nismara.my.id/nismara-logo.png",
                        },
                        footer: { text: "Nismara Transport HR" },
                        timestamp: new Date().toISOString(),
                      },
                    ],
                  }),
                },
              );
            }
          } catch (e) {
            console.error(e);
          }

          // Send DM to Manager
          if (registration.managerId) {
            try {
              const resManager = await fetch(
                `https://discord.com/api/v10/users/@me/channels`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    recipient_id: registration.managerId,
                  }),
                },
              );
              if (resManager.ok) {
                const dmChannelManager = await resManager.json();
                await fetch(
                  `https://discord.com/api/v10/channels/${dmChannelManager.id}/messages`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      content: `Halo <@${registration.managerId}>,`,
                      embeds: [
                        {
                          title: "📌 PENGINGAT SOP: Anggota Baru Diterima",
                          description: `Pendaftar dengan Discord <@${registration.userId}> (**${registration.username}**) baru saja resmi diterima masuk ke VTC Nismara Transport.\n\nSesuai SOP, mohon segera hubungi (DM atau mention) anggota baru tersebut untuk **memberikan sambutan selamat datang** dan **memberikan Guide Book** agar mereka mengerti peraturan dan tata cara bermain di Nismara Transport.`,
                          color: 3447003, // Blue
                          footer: { text: "Nismara Transport HR System" },
                          timestamp: new Date().toISOString(),
                        },
                      ],
                    }),
                  },
                );
              }
            } catch (e) {
              console.error(e);
            }
          }
        }

        return NextResponse.json({ success: true, message: "Manual Approved" });
      }

      if (action === "reject") {
        // 1. Update status
        await db
          .collection("registrations")
          .updateOne(
            { _id: regId },
            { $set: { status: "rejected", updatedAt: new Date() } },
          );

        // 2. Send DM
        if (DISCORD_BOT_TOKEN) {
          try {
            const res = await fetch(
              `https://discord.com/api/v10/users/@me/channels`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ recipient_id: registration.userId }),
              },
            );
            if (res.ok) {
              const dmChannel = await res.json();
              await fetch(
                `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    content: `Halo <@${registration.userId}>,`,
                    embeds: [
                      {
                        title: "❌ Mohon Maaf, Lamaran Anda Ditolak",
                        description:
                          "Lamaran Anda ke VTC Nismara Transport telah **DITOLAK**. Terima kasih atas ketertarikan Anda.",
                        color: 15158332, // Red
                        thumbnail: {
                          url: "https://images.nismara.my.id/nismara-logo.png",
                        },
                        footer: { text: "Nismara Transport HR" },
                        timestamp: new Date().toISOString(),
                      },
                    ],
                  }),
                },
              );
            }
          } catch (e) {
            console.error(e);
          }
        }

        return NextResponse.json({ success: true, message: "Manual Rejected" });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
