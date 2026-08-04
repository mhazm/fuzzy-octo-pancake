import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const INTERN_ROLE_ID = process.env.DISCORD_INTERN_ROLE_ID;

async function sendDiscordMessage(channelId: string, message: string, embeds?: any[]) {
  if (!DISCORD_BOT_TOKEN) return;
  const payload: any = { content: message };
  if (embeds && embeds.length > 0) payload.embeds = embeds;
  
  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

async function sendDiscordDM(discordId: string, message: string, embeds?: any[]) {
  if (!DISCORD_BOT_TOKEN) return;
  try {
    const res = await fetch(`https://discord.com/api/v10/users/@me/channels`, {
      method: "POST",
      headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: discordId })
    });
    if (res.ok) {
      const channel = await res.json();
      await sendDiscordMessage(channel.id, message, embeds);
    }
  } catch (e) {
    console.error(e);
  }
}

async function deleteDiscordChannel(channelId: string) {
  if (!DISCORD_BOT_TOKEN) return;
  await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}` }
  });
}

async function assignDiscordRole(discordId: string, roleId: string) {
  if (!DISCORD_BOT_TOKEN || !GUILD_ID) return;
  await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}/roles/${roleId}`, {
    method: "PUT",
    headers: { "Authorization": `Bot ${DISCORD_BOT_TOKEN}` }
  });
}

export async function POST(req: Request) {
  try {
    // 1. Verifikasi Header Secret (Untuk memastikan request ini dari Cloudflare Worker kita)
    const secret = req.headers.get("x-webhook-secret");
    if (secret !== process.env.TRUCKY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized. Invalid Secret." }, { status: 401 });
    }

    const payload = await req.json();
    const type = payload.type || payload.event;
    
    // Trucky nested user_id structure could be payload.data.user_id or payload.user_id
    const truckyId = payload.data?.user_id?.toString() || payload.user_id?.toString();
    
    if (!truckyId || !type) {
      return NextResponse.json({ error: "Invalid payload, missing type or user_id" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Find pending registration with this truckyId
    const registration = await db.collection("registrations").findOne({ 
      truckyId: { $in: [truckyId, Number(truckyId)] },
      status: "pending"
    });

    if (!registration) {
      return NextResponse.json({ error: "Registration not found or already processed" }, { status: 404 });
    }

    const { _id, discordChannelId, managerId, userId: discordId, username } = registration;

    if (type === "application_created") {
      if (discordChannelId) {
        const mention = managerId ? `<@${managerId}>` : "Tim HR";
        await sendDiscordMessage(
          discordChannelId, 
          `🔔 <@${discordId}> Pendaftaran Anda sedang divalidasi oleh sistem. ${mention}, mohon cek Trucky VTC!`,
          [
            {
              title: "📥 Lamaran Diterima di Trucky",
              description: `Pendaftar baru saja melakukan *apply* langsung ke VTC Trucky!\nMohon segera periksa dan ambil keputusan (Terima/Tolak) di Dashboard Trucky VTC.`,
              color: 3447003, // Blue
              footer: { text: "Sistem Pendaftaran Nismara Transport" },
              timestamp: new Date().toISOString()
            }
          ]
        );
      }
    } 
    else if (type === "application_accepted") {
      // 1. Update status
      await db.collection("registrations").updateOne({ _id }, { $set: { status: "approved", updatedAt: new Date() } });
      
      // 2. Add to driverlinks
      await db.collection("driverlinks").updateOne(
        { userId: discordId },
        { 
          $set: { 
            guildId: GUILD_ID, 
            userId: discordId, 
            truckyId: Number(truckyId), 
            truckyName: username, 
            updatedAt: new Date() 
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );

      // 3. Create/update in users
      await db.collection("users").updateOne(
        { $or: [{ discordId: discordId }, { id: discordId }] },
        { 
          $set: { 
            discordId: discordId, 
            truckyId: Number(truckyId), 
            isDriver: true, 
            updatedAt: new Date() 
          }
        },
        { upsert: true }
      );

      // 4. Assign role intern
      if (INTERN_ROLE_ID) {
        await assignDiscordRole(discordId, INTERN_ROLE_ID);
      }

      // 5. Send DM to User and delete channel
      await sendDiscordDM(
        discordId, 
        `Halo <@${discordId}>,`,
        [
          {
            title: "🎉 SELAMAT! Lamaran Anda Diterima",
            description: "Lamaran Anda ke VTC Nismara Transport telah **DITERIMA**.\nAnda sekarang resmi menjadi Intern kami. Silakan kembali ke server Discord, role Anda telah kami sesuaikan!",
            color: 3066993, // Green
            thumbnail: { url: "https://images.nismara.my.id/nismara-logo.png" },
            footer: { text: "Nismara Transport HR" },
            timestamp: new Date().toISOString()
          }
        ]
      );

      // 6. Send DM Reminder to the Manager
      if (managerId) {
        await sendDiscordDM(
          managerId,
          `Halo <@${managerId}>,`,
          [
            {
              title: "📌 PENGINGAT SOP HR: Anggota Baru Diterima",
              description: `Pendaftar dengan Discord <@${discordId}> (**${username}**) baru saja resmi diterima masuk ke VTC Nismara Transport.\n\nSesuai SOP, mohon segera hubungi (DM atau mention) anggota baru tersebut untuk **memberikan sambutan selamat datang** dan **memberikan Guide Book** agar mereka mengerti peraturan dan tata cara bermain di Nismara Transport.`,
              color: 3447003, // Blue
              footer: { text: "Nismara Transport HR System" },
              timestamp: new Date().toISOString()
            }
          ]
        );
      }

      if (discordChannelId) {
        await deleteDiscordChannel(discordChannelId);
      }
    } 
    else if (type === "application_rejected") {
      // 1. Update status
      await db.collection("registrations").updateOne({ _id }, { $set: { status: "rejected", updatedAt: new Date() } });
      
      // 2. Send DM and delete channel
      await sendDiscordDM(
        discordId, 
        `Halo <@${discordId}>,`,
        [
          {
            title: "❌ Mohon Maaf, Lamaran Anda Ditolak",
            description: "Lamaran Anda ke VTC Nismara Transport telah **DITOLAK** di Trucky.\nTerima kasih atas ketertarikan Anda. Jangan menyerah dan mungkin kita bisa bertemu di lain kesempatan!",
            color: 15158332, // Red
            thumbnail: { url: "https://images.nismara.my.id/nismara-logo.png" },
            footer: { text: "Nismara Transport HR" },
            timestamp: new Date().toISOString()
          }
        ]
      );
      if (discordChannelId) {
        await deleteDiscordChannel(discordChannelId);
      }
    }

    return NextResponse.json({ success: true, processed: type });

  } catch (error: any) {
    console.error("Webhook Trucky Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
