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
import "@/lib/models/GarageSlot";
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
    const fleet = await Fleet.findById(order.fleetId);
    if (!fleet) {
      return NextResponse.json({ error: "Kendaraan (Fleet) tidak ditemukan" }, { status: 404 });
    }
    let gameId = fleet.game_id.toLowerCase();
    
    // Trucky API sometimes uses '1' for ETS2 and '2' for ATS
    if (gameId === "1") gameId = "ets2";
    if (gameId === "2") gameId = "ats";
    
    const isVip = userObj?.nismaraplus?.status === true;

    // Find available slot based on game and VIP status
    // If VIP, check VIP slots first, then regular
    // If regular, check only regular slots
    let assignedSlot = null;
    let assignedSlotDoc = null;

    if (isVip) {
      assignedSlotDoc = await mongoose.model("GarageSlot").findOneAndUpdate(
        { game_id: gameId, type: "vip", status: "available", condition: { $gt: 0 } },
        { $set: { status: "in_use", currentOrderId: order._id, fleetId: order.fleetId } },
        { new: true, sort: { slotId: 1 } }
      );
    }

    if (!assignedSlotDoc) {
      assignedSlotDoc = await mongoose.model("GarageSlot").findOneAndUpdate(
        { game_id: gameId, type: "regular", status: "available", condition: { $gt: 0 } },
        { $set: { status: "in_use", currentOrderId: order._id, fleetId: order.fleetId } },
        { new: true, sort: { slotId: 1 } }
      );
    }

    order.managerId = session.user.discordId;

    if (assignedSlotDoc) {
      assignedSlot = assignedSlotDoc.slotId;
      // Masuk garasi (in_service)
      order.status = "in_service";
      // We still store slotNumber/Id as string now
      order.slotNumber = assignedSlot;
      order.maintenanceStartAt = new Date();
      
      const endAt = new Date();
      endAt.setTime(endAt.getTime() + order.serviceDuration * 24 * 60 * 60 * 1000);
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
        `Permintaan servis disetujui. Kendaraan masuk ke Garasi Slot ${assignedSlot}. Estimasi selesai pada ${endAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB.`,
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
            content: `✅ Permintaan ${typeText} telah dikonfirmasi oleh <@${session.user.discordId}>. Kendaraan telah masuk ke Garasi Slot ${assignedSlot}. Estimasi selesai pada **${endAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB**.`
          })
        });
      }

    } else {
      // Masuk waiting list
      order.status = "waiting";
      
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
