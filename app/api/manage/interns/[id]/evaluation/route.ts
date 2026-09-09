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
    const discordId = id; // The intern's discordId

    await dbConnect();
    const client = await clientPromise;
    const db = client.db();

    // 1. Cek data user intern
    const user = await db.collection("users").findOne({ discordId });
    if (!user) {
      return NextResponse.json(
        { error: "Intern tidak ditemukan di database" },
        { status: 404 },
      );
    }

    // 2. 🛡️ ATOMIC GATE: Cek apakah sudah ada evaluasi aktif untuk driver ini
    const existingActive = await DriverEvaluation.findOne({
      driverId: discordId,
      status: "active",
    });

    if (existingActive) {
      return NextResponse.json(
        {
          error: "Driver ini sudah memiliki sesi evaluasi aktif!",
          channelId: existingActive.channelId,
          channelName: existingActive.channelName,
        },
        { status: 400 },
      );
    }

    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const GUILD_ID = process.env.DISCORD_GUILD_ID;
    const CATEGORY_ID =
      process.env.DISCORD_INTERVIEW_CHANNEL_ID ||
      process.env.DISCORD_TICKET_CATEGORY_ID;
    const MANAGER_ROLE_ID = process.env.DISCORD_MANAGER_ROLE_ID;

    if (!DISCORD_BOT_TOKEN || !GUILD_ID || !CATEGORY_ID) {
      return NextResponse.json(
        { error: "Konfigurasi Discord API tidak lengkap" },
        { status: 500 },
      );
    }

    const safeUsername =
      user.name?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "driver";
    const channelName = `📋|evaluasi-driver-${safeUsername}`;

    // 3. Buat Channel di Discord
    // Hak akses: Hanya user intern yang dievaluasi (type: 1) dan role Manager (type: 0), @everyone denied
    const createChannelRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: channelName,
          type: 0, // GUILD_TEXT
          parent_id: CATEGORY_ID,
          permission_overwrites: [
            { id: GUILD_ID, type: 0, deny: "1024" }, // Everyone cannot view (VIEW_CHANNEL deny)
            { id: discordId, type: 1, allow: "68608" }, // Hanya user yang bersangkutan (VIEW_CHANNEL + SEND_MESSAGES + READ_MESSAGE_HISTORY)
            ...(MANAGER_ROLE_ID
              ? [{ id: MANAGER_ROLE_ID, type: 0, allow: "68608" }] // Role Manager can view & send
              : []),
          ],
        }),
      },
    );

    if (!createChannelRes.ok) {
      const errRes = await createChannelRes.text();
      console.error("Failed to create Discord evaluation channel:", errRes);
      return NextResponse.json(
        { error: "Gagal membuat channel discord untuk evaluasi driver" },
        { status: 500 },
      );
    }

    const channelData = await createChannelRes.json();
    const appUrl =
      process.env.NEXTAUTH_URL || "https://transport.nismara.web.id";

    // 4. Kirim pesan pembuka ke channel evaluasi
    await fetch(
      `https://discord.com/api/v10/channels/${channelData.id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `Halo <@${discordId}>, Anda telah dipanggil oleh Manajer <@${session.user.discordId}> untuk sesi **Audit & Evaluasi Driver Magang Nismara Transport**.\n\nSilakan gunakan channel ini untuk berdiskusi dengan tim Manajemen terkait performa, kendala, kepatuhan aturan VTC, maupun persiapan kelulusan/promosi Anda`,
        }),
      },
    );

    // 5. Simpan ke koleksi driverevaluations
    const newEvaluation = await DriverEvaluation.create({
      driverId: discordId,
      driverName: user.name || "Driver Intern",
      driverTruckyId: user.truckyId,
      channelId: channelData.id,
      channelName: channelData.name,
      status: "active",
      openedByManagerId: String(session.user.discordId),
      openedByManagerName: session.user.name || "Manager",
      openedAt: new Date(),
      kpiAwarded: false,
    });

    // 6. Catat notifikasi web ke driver intern
    await db.collection("notifications").insertOne({
      type: "info",
      title: "Panggilan Evaluasi Magang",
      message: `Manajer ${session.user.name || "Manager"} telah membuat channel evaluasi untuk Anda di Discord (${channelName}).`,
      recipient: discordId,
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: `Channel evaluasi (${channelName}) berhasil dibuat di Discord.`,
        evaluation: newEvaluation,
        channelUrl: `https://discord.com/channels/${GUILD_ID}/${channelData.id}`,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    console.error("POST Evaluation Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat membuat evaluasi" },
      { status: 500 },
    );
  }
}
