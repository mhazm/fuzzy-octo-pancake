import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import Ticket from "@/lib/models/Ticket";

import dbConnect from "@/lib/mongoose";
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

    await dbConnect();

    const query = mongoose.isValidObjectId(ticketId) 
      ? { $or: [{ _id: ticketId }, { ticketId }] }
      : { ticketId };
    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    }

    if (ticket.status === "resolved" || ticket.status === "rejected") {
      return NextResponse.json({ error: "Tiket sudah ditutup" }, { status: 400 });
    }

    if (ticket.status === "claimed" && ticket.managerId === session.user.discordId) {
      return NextResponse.json({ error: "Anda sudah mengurus tiket ini" }, { status: 400 });
    }

    // Mencegah manager mengklaim tiket yang dibuat oleh dirinya sendiri
    if (ticket.discordId === session.user.discordId) {
      return NextResponse.json({ error: "Anda tidak dapat mengurus tiket Anda sendiri" }, { status: 403 });
    }

    const isRetake = ticket.status === "claimed";

    ticket.managerId = session.user.discordId;
    ticket.status = "claimed";
    await ticket.save();

    // Notify in Discord channel
    if (DISCORD_BOT_TOKEN && ticket.discordChannelId) {
      const message = isRetake
        ? `Perhatian: Tiket ini telah **diambil alih (Retake)** oleh <@${session.user.discordId}> dari pengurus sebelumnya. Mohon sampaikan detail lanjutan di sini.`
        : `Tiket ini telah diambil alih oleh <@${session.user.discordId}>. Mohon sampaikan detail lanjutan di sini.`;
        
      await fetch(`https://discord.com/api/v10/channels/${ticket.discordChannelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: message
        })
      });
    }

    return NextResponse.json({ success: true, message: "Tiket berhasil diklaim" });

  } catch (error) {
    console.error("Ticket Claim Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
