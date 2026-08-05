import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import ScratchTicket from "@/lib/models/ScratchTicket";
import { redis } from "@/lib/redis";

const GUILD_ID = "863959415702028318";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discordId = session.user.discordId;
    const { ticketId } = await req.json();

    if (!ticketId) {
      return NextResponse.json(
        { error: "Ticket ID is required" },
        { status: 400 }
      );
    }

    if (ticketId.startsWith("redis_ticket_")) {
      // 1. Tangani Tiket dari Redis
      const ticketData = await redis.hgetall(`ticket:${ticketId}`);
      if (!ticketData || Object.keys(ticketData).length === 0) {
        return NextResponse.json({ error: "Ticket not found or expired in session" }, { status: 404 });
      }

      if (ticketData.isScratched === true || ticketData.isScratched === "true") {
        return NextResponse.json({ error: "Ticket has already been scratched" }, { status: 400 });
      }

      // Tandai sudah digesek
      await redis.hset(`ticket:${ticketId}`, { isScratched: true, scratchedAt: new Date().toISOString() });

      const prizeWon = Number(ticketData.prizeWon || 0);

      // Tambah net_profit jika menang
      if (prizeWon > 0) {
        await redis.incrby(`net_profit:${discordId}`, prizeWon);
      }

      return NextResponse.json({
        message: "Ticket revealed successfully (Redis)",
        ticket: { ...ticketData, isScratched: true, prizeWon },
      });

    } else {
      // 2. Tangani Tiket dari MongoDB (Legacy / Fallback)
      await clientPromise;

      // Find the ticket
      const ticket = await ScratchTicket.findOne({
        _id: ticketId,
        discordId: discordId,
      });

      if (!ticket) {
        return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
      }

      if (ticket.isScratched) {
        return NextResponse.json(
          { error: "Ticket has already been scratched" },
          { status: 400 }
        );
      }

      // Mark as scratched
      ticket.isScratched = true;
      ticket.scratchedAt = new Date();
      await ticket.save();

      // If winning, add to balance
      if (ticket.isWinning && ticket.prizeWon > 0) {
        const client = await clientPromise;
        const db = client.db();

        const updateRes = await db
          .collection("currencies")
          .updateOne(
            { userId: discordId, guildId: GUILD_ID },
            { $inc: { totalNC: ticket.prizeWon } }
          );

        if (updateRes.modifiedCount > 0) {
          // Log the earn
          await db.collection("currencyhistories").insertOne({
            userId: discordId,
            guildId: GUILD_ID,
            amount: ticket.prizeWon,
            type: "earn",
            reason: `Memenangkan Nismara Scratch & Win`,
            createdAt: new Date(),
          });
        }
      }

      return NextResponse.json({
        message: "Ticket revealed successfully",
        ticket,
      });
    }
  } catch (error: any) {
    console.error("Scratch Reveal Error:", error);
    return NextResponse.json(
      { error: "Failed to reveal ticket" },
      { status: 500 }
    );
  }
}
