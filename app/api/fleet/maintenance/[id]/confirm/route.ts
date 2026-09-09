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
import { checkRateLimit } from "@/lib/rateLimit";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

function normalizeGameId(raw: any): "ets2" | "ats" {
  const g = String(raw || "").toLowerCase();
  if (g === "2" || g.includes("ats")) return "ats";
  return "ets2";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let orderId: string | null = null;
  let driverDiscordId: string | null = null;
  let deductAmount = 0;
  let isDeducted = false;
  let adminFeeAmount = 0;
  let isFeeGiven = false;
  let managerDiscordId: string | null = null;
  let acquiredSlotId: string | null = null;
  let targetFleetId: any = null;

  try {
    const params = await context.params;
    orderId = params.id;
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isManager =
      session.user.role === "manager" ||
      session.user.role === "admin";

    if (!isManager) {
      return NextResponse.json(
        { error: "Hanya Manager atau Admin yang memiliki akses untuk mengonfirmasi servis armada" },
        { status: 403 }
      );
    }

    // 🛡️ RATE LIMIT: Batasi 1 request per 2 detik per manager
    if (!checkRateLimit(session.user.discordId, "fleet-maintenance-confirm", 2000)) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Mohon tunggu sesaat sebelum mengonfirmasi kembali." },
        { status: 429 }
      );
    }

    managerDiscordId = String(session.user.discordId);

    await dbConnect();

    const client = await clientPromise;
    const db = client.db();

    // 🛡️ ATOMIC GATE: Kunci status order menjadi "processing" agar tidak dikonfirmasi ganda oleh manager lain
    const order = await FleetMaintenanceOrder.findOneAndUpdate(
      { _id: params.id, status: "pending" },
      { $set: { status: "processing" } },
      { returnDocument: "after" }
    );

    if (!order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan, bukan dalam status pending, atau sedang diproses oleh manager lain" },
        { status: 400 }
      );
    }

    targetFleetId = order.fleetId;
    driverDiscordId = order.discordId;
    deductAmount = order.totalPrice;
    adminFeeAmount = order.adminFee;

    // 2. 🛡️ ATOMIC DEDUCTION: Potong saldo dari driver secara atomik
    const deductRes = await db
      .collection("currencies")
      .updateOne(
        { userId: order.discordId, guildId: GUILD_ID, totalNC: { $gte: order.totalPrice } },
        { $inc: { totalNC: -order.totalPrice } },
      );
      
    if (deductRes.modifiedCount === 0) {
      // Revert status order back to pending jika saldo tidak cukup
      await FleetMaintenanceOrder.updateOne({ _id: order._id }, { $set: { status: "pending" } });
      return NextResponse.json(
        { error: "Saldo NC user tidak mencukupi saat ini." },
        { status: 400 },
      );
    }

    isDeducted = true;
      
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

    // 3. Add admin fee to manager (Hanya jika manager mengonfirmasi armada milik user lain)
    const isSelfService = String(session.user.discordId) === String(order.discordId);

    if (!isSelfService && order.adminFee > 0) {
      await db.collection("currencies").updateOne(
        { userId: session.user.discordId, guildId: GUILD_ID },
        { $inc: { totalNC: order.adminFee } },
        { upsert: true }
      );
      isFeeGiven = true;

      await db.collection("currencyhistories").insertOne({
        userId: session.user.discordId,
        guildId: GUILD_ID,
        amount: order.adminFee,
        type: "earn",
        reason: `Admin Fee Servis Armada`,
        createdAt: new Date(),
      });
    }

    // 4. Assign Slot if available
    const fleet = await Fleet.findById(order.fleetId).populate("model");
    if (!fleet) {
      throw new Error("Kendaraan (Fleet) tidak ditemukan di database");
    }
    const rawGameId = fleet.model?.game_id ?? fleet.game_id;
    const gameId = normalizeGameId(rawGameId);
    
    const isVip = userObj?.nismaraplus?.status === true;

    // Slot priority: Prioritaskan Regular Slot terlebih dahulu.
    // Jika Regular penuh dan user adalah Nismara+ (VIP), gunakan VIP Slot.
    let assignedSlot = null;
    let assignedSlotDoc = null;

    // 1. Coba Regular Slot terlebih dahulu
    assignedSlotDoc = await mongoose.model("GarageSlot").findOneAndUpdate(
      { game_id: gameId, type: "regular", status: "available", condition: { $gt: 0 } },
      { $set: { status: "in_use", currentOrderId: order._id, fleetId: order.fleetId } },
      { returnDocument: "after", sort: { slotId: 1 } }
    );

    // 2. Jika Regular penuh, gunakan VIP Slot khusus untuk user Nismara+
    if (!assignedSlotDoc && isVip) {
      assignedSlotDoc = await mongoose.model("GarageSlot").findOneAndUpdate(
        { game_id: gameId, type: "vip", status: "available", condition: { $gt: 0 } },
        { $set: { status: "in_use", currentOrderId: order._id, fleetId: order.fleetId } },
        { returnDocument: "after", sort: { slotId: 1 } }
      );
    }

    if (assignedSlotDoc) {
      assignedSlot = assignedSlotDoc.slotId;
      acquiredSlotId = assignedSlot; // 🛡️ Kunci segera untuk rollback yang aman
    }

    order.managerId = session.user.discordId;

    if (assignedSlotDoc) {
      const startAt = new Date();
      const endAt = new Date(startAt.getTime() + order.serviceDuration * 24 * 60 * 60 * 1000);

      // Masuk garasi (in_service)
      order.status = "in_service";
      order.slotNumber = assignedSlot;
      order.maintenanceStartAt = startAt;
      order.maintenanceEndAt = endAt;

      // Update fleet status and maintenance dates
      const updatedFleet = await Fleet.findByIdAndUpdate(order.fleetId, { 
        status: "onservice",
        maintenance_start_date: startAt,
        maintenance_end_date: endAt
      }, { returnDocument: "after" });
      
      // Save order state
      await order.save();

      // Notifikasi Servis Dimulai (Masuk Garasi) - Non-blocking
      sendPersonalNotification(
        order.discordId,
        "Servis Dimulai 🛠️",
        `Permintaan servis disetujui. Kendaraan masuk ke Garasi Slot ${assignedSlot}. Estimasi selesai pada ${endAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB.`,
        "info",
        `/dashboard/garage/fleet/${updatedFleet?.get("id") || order.fleetId}`
      ).catch(console.error);
      
      // Notify discord - Non-blocking
      if (DISCORD_BOT_TOKEN && order.discordChannelId) {
        const typeText = order.type === "replace" ? "penggantian komponen" : "servis";
        fetch(`https://discord.com/api/v10/channels/${order.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: `✅ Permintaan ${typeText} telah dikonfirmasi oleh <@${session.user.discordId}>. Kendaraan telah masuk ke Garasi Slot ${assignedSlot}. Estimasi selesai pada **${endAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB**.`
          })
        }).catch(console.error);
      }

    } else {
      // Masuk waiting list
      order.status = "waiting";
      order.slotNumber = null;
      order.maintenanceStartAt = null;
      order.maintenanceEndAt = null;
      
      const waitFleet = await Fleet.findByIdAndUpdate(order.fleetId, { 
        status: "onservice",
        maintenance_start_date: null,
        maintenance_end_date: null
      }, { returnDocument: "after" });

      // Save order state
      await order.save();

      // Notifikasi Masuk Waiting List - Non-blocking
      sendPersonalNotification(
        order.discordId,
        "Daftar Tunggu Servis ⏳",
        `Permintaan disetujui, namun garasi penuh. Kendaraan Anda masuk ke dalam Daftar Tunggu (Waiting List).`,
        "warning",
        `/dashboard/garage/fleet/${waitFleet?.get("id") || order.fleetId}`
      ).catch(console.error);

      if (DISCORD_BOT_TOKEN && order.discordChannelId) {
        const typeText = order.type === "replace" ? "penggantian komponen" : "servis";
        fetch(`https://discord.com/api/v10/channels/${order.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: `⏳ Permintaan ${typeText} telah dikonfirmasi oleh <@${session.user.discordId}>. Saat ini garasi penuh, kendaraan Anda masuk ke dalam Daftar Tunggu (Waiting List).`
          })
        }).catch(console.error);
      }
    }

    try {
      revalidatePath("/dashboard/garage/fleet");
      revalidatePath("/dashboard/manage/fleet/service");
      revalidatePath("/dashboard/transactions");
    } catch (e) {
      console.error("Failed to revalidate maintenance confirm paths", e);
    }

    return NextResponse.json({ success: true, status: order.status });
  } catch (error: any) {
    console.error("Fleet Maintenance Confirm Error:", error);

    // 🛡️ Automatic Rollback if any unexpected exception occurred
    try {
      const client = await clientPromise;
      const db = client.db();

      if (isDeducted && driverDiscordId && deductAmount > 0) {
        await db.collection("currencies").updateOne(
          { userId: driverDiscordId, guildId: GUILD_ID },
          { $inc: { totalNC: deductAmount } }
        );
        await db.collection("currencyhistories").insertOne({
          userId: driverDiscordId,
          guildId: GUILD_ID,
          amount: deductAmount,
          type: "earn",
          reason: `Rollback Servis Armada Gagal (Order ID: ${orderId})`,
          createdAt: new Date(),
        });
      }

      if (isFeeGiven && managerDiscordId && adminFeeAmount > 0) {
        await db.collection("currencies").updateOne(
          { userId: managerDiscordId, guildId: GUILD_ID },
          { $inc: { totalNC: -adminFeeAmount } }
        );
      }

      if (acquiredSlotId) {
        await mongoose.model("GarageSlot").updateOne(
          { slotId: acquiredSlotId },
          { $set: { status: "available", currentOrderId: null, fleetId: null } }
        );
      }

      if (orderId) {
        await FleetMaintenanceOrder.updateOne(
          { _id: orderId, status: { $in: ["processing", "in_service", "waiting"] } },
          { $set: { status: "pending", managerId: null, slotNumber: null, maintenanceStartAt: null, maintenanceEndAt: null } }
        );
      }

      if (targetFleetId) {
        await Fleet.updateOne(
          { _id: targetFleetId, status: "onservice" },
          { $set: { status: "need_maintenance", maintenance_start_date: null, maintenance_end_date: null } }
        );
      }
    } catch (rollbackErr) {
      console.error("Critical Rollback Error:", rollbackErr);
    }

    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan internal saat mengonfirmasi order" },
      { status: 500 },
    );
  }
}
