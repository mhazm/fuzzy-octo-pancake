import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const discordId = id; // The ID passed is the discordId of the intern
    const client = await clientPromise;
    const db = client.db();

    // Dapatkan data user
    const user = await db.collection("users").findOne({ discordId });
    if (!user) {
      return NextResponse.json({ error: "Intern tidak ditemukan di database" }, { status: 404 });
    }

    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const GUILD_ID = process.env.DISCORD_GUILD_ID;
    const CATEGORY_ID = process.env.DISCORD_INTERVIEW_CHANNEL_ID || process.env.DISCORD_TICKET_CATEGORY_ID;
    const MANAGER_ROLE_ID = process.env.DISCORD_MANAGER_ROLE_ID;

    if (!DISCORD_BOT_TOKEN || !GUILD_ID || !CATEGORY_ID) {
      return NextResponse.json({ error: "Konfigurasi Discord API tidak lengkap" }, { status: 500 });
    }

    const safeUsername = user.name?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "intern";
    const channelName = `interview-${safeUsername}`;

    // Buat Channel di Discord
    const createChannelRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: channelName,
        type: 0,
        parent_id: CATEGORY_ID,
        permission_overwrites: [
          { id: GUILD_ID, type: 0, deny: "1024" }, // Everyone cannot view
          { id: discordId, type: 1, allow: "68608" }, // Intern can view & send messages
          { id: MANAGER_ROLE_ID, type: 0, allow: "68608" } // Managers can view & send messages
        ]
      })
    });

    if (!createChannelRes.ok) {
      const errRes = await createChannelRes.text();
      console.error("Failed to create Discord channel:", errRes);
      return NextResponse.json({ error: "Gagal membuat channel discord untuk interview" }, { status: 500 });
    }

    const channelData = await createChannelRes.json();
    const appUrl = process.env.NEXTAUTH_URL || "https://nismara-logistics.com";

    // Kirim pesan undangan
    await fetch(`https://discord.com/api/v10/channels/${channelData.id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: `Halo <@${discordId}>, Anda telah diundang oleh Manajer untuk melakukan **Ujian Kelayakan Promosi**.\n\nSilakan kerjakan ujian kelayakan melalui link berikut: ${appUrl}/dashboard/exam\n\n*(Catatan: Anda diberi waktu 15 menit untuk menyelesaikan 20 soal)*`
      })
    });

    // Beri tanda bahwa user sedang dalam masa ujian kelayakan
    await db.collection("users").updateOne({ discordId }, { $set: { isInterviewing: true } });

    return NextResponse.json({ success: true, message: "Interview berhasil dimulai dan channel telah dibuat." });
  } catch (error) {
    console.error("POST Interview Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
