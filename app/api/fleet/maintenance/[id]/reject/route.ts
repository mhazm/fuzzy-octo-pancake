import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import FleetMaintenanceOrder from "@/lib/models/FleetMaintenanceOrder";
import Transaction from "@/lib/models/Transaction";
import { sendPersonalNotification } from "@/lib/services/NotificationService";

import dbConnect from "@/lib/mongoose";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Use findOneAndUpdate to prevent race conditions
    const order = await FleetMaintenanceOrder.findOneAndUpdate(
      { _id: params.id, status: "pending" },
      { $set: { status: "rejected", managerId: session.user.discordId } },
      { new: true }
    );

    if (!order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan atau sudah diproses" },
        { status: 400 },
      );
    }

    // Update pending transaction to failed
    await Transaction.findOneAndUpdate(
      { "metadata.orderId": order._id },
      { $set: { status: "failed" } }
    );

    // Notify User
    await sendPersonalNotification(
      order.discordId,
      "Servis Ditolak ❌",
      `Permintaan servis kendaraan Anda telah ditolak oleh Manager. Saldo NC Anda tidak dipotong.`,
      "error",
      `/dashboard/garage/fleet/${order.fleetId}`
    );

    // Delete Discord Channel
    if (DISCORD_BOT_TOKEN && order.discordChannelId) {
      await fetch(
        `https://discord.com/api/v10/channels/${order.discordChannelId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          },
        },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Fleet Maintenance Reject Error:", error);
    
    // Attempt rollback if error occurs
    try {
      const params = await context.params;
      await FleetMaintenanceOrder.updateOne(
        { _id: params.id, status: "rejected" },
        { $set: { status: "pending", managerId: null } }
      );
    } catch (e) {
      console.error("Rollback error:", e);
    }

    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan internal saat menolak order" },
      { status: 500 },
    );
  }
}
