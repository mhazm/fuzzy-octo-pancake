import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import FleetOrder from "@/lib/models/FleetOrder";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI!);
    }

    const order = await FleetOrder.findById(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.status !== "pending") {
      return NextResponse.json({ error: "Order sudah diambil oleh staff lain" }, { status: 400 });
    }

    order.managerId = session.user.discordId;
    order.status = "claimed";
    await order.save();

    // Optionally notify in discord
    const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    if (DISCORD_BOT_TOKEN && order.discordChannelId) {
      await fetch(`https://discord.com/api/v10/channels/${order.discordChannelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: `Tiket ini telah diambil oleh <@${session.user.discordId}>. Pemesanan sedang diproses.`
        })
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fleet Order Claim Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
