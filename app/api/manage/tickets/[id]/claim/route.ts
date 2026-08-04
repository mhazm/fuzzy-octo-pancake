import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import Ticket from "@/lib/models/Ticket";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const query = mongoose.isValidObjectId(ticketId) 
      ? { $or: [{ _id: ticketId }, { ticketId }] }
      : { ticketId };
    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    }

    if (ticket.status !== "open") {
      return NextResponse.json({ error: "Tiket sudah diklaim atau ditutup" }, { status: 400 });
    }

    if (process.env.NODE_ENV === "production" && ticket.discordId === session.user.discordId) {
      return NextResponse.json({ error: "Anda tidak dapat mengurus tiket Anda sendiri" }, { status: 403 });
    }

    ticket.managerId = session.user.discordId;
    ticket.status = "claimed";
    await ticket.save();

    // Notify in Discord channel
    if (DISCORD_BOT_TOKEN && ticket.discordChannelId) {
      await fetch(`https://discord.com/api/v10/channels/${ticket.discordChannelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: `Tiket ini telah diambil alih oleh <@${session.user.discordId}>. Mohon sampaikan detail lanjutan di sini.`
        })
      });
    }

    return NextResponse.json({ success: true, message: "Tiket berhasil diklaim" });

  } catch (error) {
    console.error("Ticket Claim Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
