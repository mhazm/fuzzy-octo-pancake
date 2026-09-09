import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import Ticket from "@/lib/models/Ticket";
import { revalidatePath } from "next/cache";

import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
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

    // 🛡️ ATOMIC GATE: Kunci rating tiket terlebih dahulu untuk mencegah race condition
    const updateTicketRes = await Ticket.updateOne(
      {
        _id: ticket._id,
        hasTipped: { $ne: true },
      },
      {
        $set: {
          rating,
          tipAmount: tipAmount || 0,
          hasTipped: true,
        },
      }
    );

    if (updateTicketRes.modifiedCount === 0) {
      return NextResponse.json({ error: "Anda sudah memberikan rating/tip untuk tiket ini" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    
    // Process tip if tipAmount > 0
    if (tipAmount && tipAmount > 0) {
      if (!ticket.managerId) {
        return NextResponse.json({ success: true, message: "Rating tersimpan (Manager tidak ditemukan untuk menerima tip)" });
      }

      // Deduct from user atomically
      const deductRes = await db.collection("currencies").updateOne(
        { userId: session.user.discordId, guildId: GUILD_ID, totalNC: { $gte: tipAmount } },
        { $inc: { totalNC: -tipAmount } }
      );

      if (deductRes.modifiedCount === 0) {
        await Ticket.updateOne({ _id: ticket._id }, { $set: { tipAmount: 0 } });
        return NextResponse.json({ success: true, message: "Rating tersimpan, namun saldo NC tidak mencukupi untuk memberi tip." });
      }

      // Add to manager
      await db.collection("currencies").updateOne(
        { userId: ticket.managerId, guildId: GUILD_ID },
        { $inc: { totalNC: tipAmount } },
        { upsert: true }
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

    try {
      revalidatePath("/dashboard/ticket");
      revalidatePath("/dashboard/manage/tickets");
    } catch (e) {
      console.error("Failed to revalidate ticket paths", e);
    }

    return NextResponse.json({ success: true, message: "Berhasil menyimpan rating dan tip!" });

  } catch (error) {
    console.error("Ticket Rate Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
