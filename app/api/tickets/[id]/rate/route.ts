import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import Ticket from "@/lib/models/Ticket";

import dbConnect from "@/lib/mongoose";
const GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: ticketId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rating, tipAmount } = await request.json();
    if (rating === undefined || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating harus antara 1-5" }, { status: 400 });
    }

    await dbConnect();

    const query = mongoose.isValidObjectId(ticketId) 
      ? { $or: [{ _id: ticketId }, { ticketId }] }
      : { ticketId };
    const ticket = await Ticket.findOne(query);
    if (!ticket) {
      return NextResponse.json({ error: "Tiket tidak ditemukan" }, { status: 404 });
    }

    if (ticket.discordId !== session.user.discordId) {
      return NextResponse.json({ error: "Ini bukan tiket Anda" }, { status: 403 });
    }

    if (ticket.status === "open" || ticket.status === "claimed") {
      return NextResponse.json({ error: "Tiket belum selesai" }, { status: 400 });
    }

    if (ticket.hasTipped) {
      return NextResponse.json({ error: "Anda sudah memberikan rating/tip" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Process tip if tipAmount > 0
    if (tipAmount && tipAmount > 0) {
      const userCurrency = await db.collection("currencies").findOne({
        userId: session.user.discordId,
        guildId: GUILD_ID,
      });

      if (!userCurrency || userCurrency.totalNC < tipAmount) {
        return NextResponse.json({ error: "Saldo NC tidak mencukupi untuk tip" }, { status: 400 });
      }

      if (!ticket.managerId) {
        return NextResponse.json({ error: "Manager tidak ditemukan untuk tiket ini" }, { status: 400 });
      }

      // Deduct from user
      await db.collection("currencies").updateOne(
        { userId: session.user.discordId, guildId: GUILD_ID },
        { $inc: { totalNC: -tipAmount } }
      );

      // Add to manager
      await db.collection("currencies").updateOne(
        { userId: ticket.managerId, guildId: GUILD_ID },
        { $inc: { totalNC: tipAmount } }
      );

      // User log
      await db.collection("currencyhistories").insertOne({
        userId: session.user.discordId,
        guildId: GUILD_ID,
        amount: tipAmount,
        type: "spend",
        reason: `Memberikan Tip ke manager untuk tiket ${ticketId}`,
        createdAt: new Date(),
      });

      // Manager log
      await db.collection("currencyhistories").insertOne({
        userId: ticket.managerId,
        guildId: GUILD_ID,
        amount: tipAmount,
        type: "earn",
        reason: `Mendapat Tip dari tiket ${ticketId}`,
        createdAt: new Date(),
      });
    }

    ticket.rating = rating;
    ticket.tipAmount = tipAmount || 0;
    ticket.hasTipped = true;
    await ticket.save();

    return NextResponse.json({ success: true, message: "Berhasil menyimpan rating" });

  } catch (error) {
    console.error("Ticket Rate Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
