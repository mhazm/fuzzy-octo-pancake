import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const discordId = id;
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const GUILD_ID = process.env.DISCORD_GUILD_ID;
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

    return NextResponse.json({ success: true, message: "Intern berhasil dipromosikan menjadi Sopir!" });
  } catch (error) {
    console.error("POST Promote Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
