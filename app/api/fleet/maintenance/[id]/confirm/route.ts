import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import FleetMaintenanceOrder from "@/lib/models/FleetMaintenanceOrder";
import Fleet from "@/lib/models/Fleet";
import "@/lib/models/FleetStore";
import "@/lib/models/User";
import "@/lib/models/FleetBrand";
import Transaction from "@/lib/models/Transaction";
import { sendPersonalNotification } from "@/lib/services/NotificationService";
import crypto from "crypto";

import dbConnect from "@/lib/mongoose";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

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

    const client = await clientPromise;
    const db = client.db();

    const order = await FleetMaintenanceOrder.findById(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
    }

    if (order.status !== "pending") {
      return NextResponse.json({ error: "Order tidak dalam status pending" }, { status: 400 });
    }

    // 1. Check buyer's balance
    const driverCurrency = await db
      .collection("currencies")
      .findOne({ userId: order.discordId, guildId: GUILD_ID });
      
    if (!driverCurrency || driverCurrency.totalNC < order.totalPrice) {
      return NextResponse.json(
        { error: "Saldo NC user tidak mencukupi saat ini." },
        { status: 400 },
      );
    }

    // 2. Deduct from buyer
    await db
      .collection("currencies")
      .updateOne(
        { userId: order.discordId, guildId: GUILD_ID },
        { $inc: { totalNC: -order.totalPrice } },
      );
      
    await db.collection("currencyhistories").insertOne({
      userId: order.discordId,
      guildId: GUILD_ID,
      amount: order.totalPrice,
      type: "spend",
      reason: `Servis Armada (Order ID: ${order._id})`,
      createdAt: new Date(),
    });

    const userObj = await mongoose.model("User").findOne({ discordId: order.discordId });
    if (userObj) {
      const existingTx = await Transaction.findOneAndUpdate(
        { "metadata.orderId": order._id },
        { $set: { status: "success" } }
      );

      if (!existingTx) {
        await Transaction.create({
          trxId: `TRX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
          discordId: order.discordId,
          userId: userObj._id,
          title: order.type === "replace" ? "Penggantian Komponen Fleet" : "Servis Rutin Fleet",
          category: "maintenance",
          amount: order.totalPrice,
          currency: "NC",
          status: "success",
          metadata: {
            orderId: order._id,
            fleetId: order.fleetId
          }
        });
      }
    }

    // 3. Add admin fee to manager
    await db.collection("currencies").updateOne(
      { userId: session.user.discordId, guildId: GUILD_ID },
      { $inc: { totalNC: order.adminFee } },
      { upsert: true }
    );
    await db.collection("currencyhistories").insertOne({
      userId: session.user.discordId,
      guildId: GUILD_ID,
      amount: order.adminFee,
      type: "earn",
      reason: `Admin Fee Servis Armada`,
      createdAt: new Date(),
    });

    // 4. Assign Slot if available
    // Count currently in_service
    const inServiceOrders = await FleetMaintenanceOrder.find({ status: "in_service" });
    const activeSlots = inServiceOrders.map(o => o.slotNumber);
    
    let assignedSlot = null;
    for (let i = 1; i <= 3; i++) {
      if (!activeSlots.includes(i)) {
        assignedSlot = i;
        break;
      }
    }

    order.managerId = session.user.discordId;

    if (assignedSlot !== null) {
      // Masuk garasi (in_service)
      order.status = "in_service";
      order.slotNumber = assignedSlot;
      order.maintenanceStartAt = new Date();
      
      const endAt = new Date();
      endAt.setDate(endAt.getDate() + order.serviceDuration);
      order.maintenanceEndAt = endAt;

      // Update fleet status and maintenance dates
      const updatedFleet = await Fleet.findByIdAndUpdate(order.fleetId, { 
        status: "onservice",
        maintenance_start_date: new Date(),
        maintenance_end_date: endAt
      }, { new: true });
      
      // Notifikasi Servis Dimulai (Masuk Garasi)
      await sendPersonalNotification(
        order.discordId,
        "Servis Dimulai 🛠️",
        `Permintaan servis disetujui. Kendaraan masuk ke Garasi Slot ${assignedSlot}. Estimasi selesai pada ${endAt.toLocaleDateString("id-ID")}.`,
        "info",
        `/dashboard/garage/fleet/${updatedFleet?.get("id") || order.fleetId}`
      );
      
      // Notify discord
      if (DISCORD_BOT_TOKEN && order.discordChannelId) {
        const typeText = order.type === "replace" ? "penggantian komponen" : "servis";
        await fetch(`https://discord.com/api/v10/channels/${order.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: `✅ Permintaan ${typeText} telah dikonfirmasi oleh <@${session.user.discordId}>. Kendaraan telah masuk ke Garasi Slot ${assignedSlot}. Estimasi selesai pada ${endAt.toLocaleDateString("id-ID")}.`
          })
        });
      }

    } else {
      // Masuk waiting list
      order.status = "waiting";
      
      // Update fleet status? Maybe keep it active until it actually enters the garage? 
      // The requirement says "menunggu terlebih dahulu". If it's waiting, can it be used? Probably shouldn't be used.
      const waitFleet = await Fleet.findByIdAndUpdate(order.fleetId, { status: "onservice" }, { new: true });

      // Notifikasi Masuk Waiting List
      await sendPersonalNotification(
        order.discordId,
        "Daftar Tunggu Servis ⏳",
        `Permintaan disetujui, namun garasi penuh. Kendaraan Anda masuk ke dalam Daftar Tunggu (Waiting List).`,
        "warning",
        `/dashboard/garage/fleet/${waitFleet?.get("id") || order.fleetId}`
      );

      if (DISCORD_BOT_TOKEN && order.discordChannelId) {
        const typeText = order.type === "replace" ? "penggantian komponen" : "servis";
        await fetch(`https://discord.com/api/v10/channels/${order.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: `⏳ Permintaan ${typeText} telah dikonfirmasi oleh <@${session.user.discordId}>. Saat ini garasi penuh, kendaraan Anda masuk ke dalam Daftar Tunggu (Waiting List).`
          })
        });
      }
    }

    await order.save();

    return NextResponse.json({ success: true, status: order.status });
  } catch (error: any) {
    console.error("Fleet Maintenance Confirm Error:", error);
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan internal saat mengonfirmasi order" },
      { status: 500 },
    );
  }
}
