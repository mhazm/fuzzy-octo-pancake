import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import Ticket from "@/lib/models/Ticket";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

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

    const { status, closingReason } = await request.json();
    if (!status || !["resolved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status harus resolved atau rejected" }, { status: 400 });
    }
    if (!closingReason) {
      return NextResponse.json({ error: "Alasan penutupan harus diisi" }, { status: 400 });
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

    if (ticket.status !== "claimed") {
      return NextResponse.json({ error: "Tiket belum diklaim atau sudah ditutup" }, { status: 400 });
    }

    if (ticket.managerId !== session.user.discordId) {
      return NextResponse.json({ error: "Anda bukan pengurus tiket ini" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Reward manager 500 NC
    const REWARD_AMOUNT = 500;
    await db.collection("currencies").updateOne(
      { userId: session.user.discordId, guildId: GUILD_ID },
      { $inc: { totalNC: REWARD_AMOUNT } }
    );
    await db.collection("currencyhistories").insertOne({
      userId: session.user.discordId,
      guildId: GUILD_ID,
      amount: REWARD_AMOUNT,
      type: "earn",
      reason: `Reward mengurus tiket: ${ticketId}`,
      createdAt: new Date(),
    });

    // Send Web Notification to the user
    await db.collection("notifications").insertOne({
      type: "info",
      title: "Tiket Ditutup",
      message: `Tiket Anda (${ticketId}) telah ditutup dengan status ${status}. Alasan: ${closingReason}`,
      recipient: ticket.discordId,
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    ticket.status = status;
    ticket.closingReason = closingReason;
    await ticket.save();

    // Notify user in Discord Channel before deleting
    if (DISCORD_BOT_TOKEN && ticket.discordChannelId) {
      await fetch(`https://discord.com/api/v10/channels/${ticket.discordChannelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: `<@${ticket.discordId}> Tiket Anda telah ditutup dengan status **${status.toUpperCase()}**.\n**Alasan:** ${closingReason}\nChannel ini akan dihapus dalam beberapa saat.`
        })
      });

      // Delete the Discord channel
      // We can do it immediately or delay it. Here we just delete it immediately.
      await fetch(`https://discord.com/api/v10/channels/${ticket.discordChannelId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        }
      });
    }

    return NextResponse.json({ success: true, message: "Tiket berhasil ditutup" });

  } catch (error) {
    console.error("Ticket Close Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
