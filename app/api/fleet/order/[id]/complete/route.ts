import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import FleetOrder from "@/lib/models/FleetOrder";
import FleetStore from "@/lib/models/FleetStore";
import Transaction from "@/lib/models/Transaction";
import Fleet from "@/lib/models/Fleet";
import User from "@/lib/models/User";
import Garage from "@/lib/models/Garage";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  let orderId: string | null = null;
  let buyerDiscordId: string | null = null;
  let buyerUserId: string | null = null;
  let deductAmount = 0;
  let isDeducted = false;
  let isFeeGiven = false;
  let adminFeeAmount = 0;
  let managerDiscordId: string | null = null;
  let createdFleetDbId: string | null = null;
  let garageUpdated = false;
  let addedSlots = 0;

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
        { error: "Hanya Manager atau Admin yang memiliki akses untuk menyelesaikan order armada" },
        { status: 403 }
      );
    }

    managerDiscordId = String(session.user.discordId);

    const body = await request.json();
    let rawPlatNumber = body.platNumber || "";
    const truckyId = body.truckyId;

    if (!rawPlatNumber) {
      return NextResponse.json(
        { error: "Plat kendaraan harus diisi" },
        { status: 400 },
      );
    }

    // Auto-format Plat Number to NL-XXX
    let platNumber = rawPlatNumber.trim().toUpperCase().replace(/\s+/g, "");
    platNumber = platNumber.replace(/^NL-?/, ""); // Remove existing NL or NL- if any
    platNumber = `NL-${platNumber}`;

    if (!truckyId) {
      return NextResponse.json(
        { error: "ID Truk (Trucky ID) harus diisi" },
        { status: 400 },
      );
    }

    await dbConnect();

    const client = await clientPromise;
    const db = client.db();

    // 🛡️ ATOMIC GATE: Kunci status order dari claimed menjadi processing
    const order = await FleetOrder.findOneAndUpdate(
      { _id: params.id, status: "claimed" },
      { $set: { status: "processing" } },
      { new: true }
    ).populate({
      path: "fleetStoreId",
      populate: {
        path: "brand",
        model: "FleetBrand"
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan, belum diambil (claimed), atau sedang diproses oleh staff lain" },
        { status: 400 },
      );
    }

    if (order.managerId !== String(session.user.discordId)) {
      // Kembalikan status ke claimed jika manager yang login berbeda
      await FleetOrder.updateOne({ _id: order._id }, { $set: { status: "claimed" } });
      return NextResponse.json(
        {
          error:
            "Hanya manager yang mengambil order ini yang dapat menyelesaikannya",
        },
        { status: 403 },
      );
    }

    // Uniqueness check: pastikan ID Trucky dan Plat Nomor belum pernah dipakai
    const duplicateFleet = await Fleet.findOne({
      $or: [
        { id: String(truckyId) },
        { fleet_number: platNumber }
      ]
    });

    if (duplicateFleet) {
      await FleetOrder.updateOne({ _id: order._id }, { $set: { status: "claimed" } });
      const isIdDup = duplicateFleet.id === String(truckyId);
      return NextResponse.json(
        { error: isIdDup ? `Kendaraan dengan ID Trucky ${truckyId} sudah terdaftar di sistem!` : `Plat nomor ${platNumber} sudah digunakan oleh armada lain!` },
        { status: 400 }
      );
    }

    const buyer = await User.findById(order.userId);
    if (!buyer) {
      await FleetOrder.updateOne({ _id: order._id }, { $set: { status: "claimed" } });
      return NextResponse.json(
        { error: "Pembeli tidak ditemukan" },
        { status: 404 },
      );
    }

    buyerDiscordId = buyer.discordId;
    buyerUserId = String(buyer._id);
    deductAmount = order.totalPrice;
    adminFeeAmount = order.adminFee;

    // 1 & 2. 🛡️ ATOMIC DEDUCTION: Potong saldo pembeli secara atomik
    const deductRes = await db
      .collection("currencies")
      .updateOne(
        { userId: buyer.discordId, guildId: GUILD_ID, totalNC: { $gte: order.totalPrice } },
        { $inc: { totalNC: -order.totalPrice } },
      );

    if (deductRes.modifiedCount === 0) {
      await FleetOrder.updateOne({ _id: order._id }, { $set: { status: "claimed" } });
      return NextResponse.json(
        {
          error: "Saldo NC pembeli tidak mencukupi saat ini. Beritahu pembeli.",
        },
        { status: 400 },
      );
    }

    isDeducted = true;

    await db.collection("currencyhistories").insertOne({
      userId: buyer.discordId,
      guildId: GUILD_ID,
      amount: order.totalPrice,
      type: "spend",
      reason: `Pembelian Fleet: ${order.fleetStoreId.name}`,
      createdAt: new Date(),
    });

    const existingTx = await Transaction.findOneAndUpdate(
      { "metadata.orderId": order._id },
      { $set: { status: "success" } }
    );

    if (!existingTx) {
      await Transaction.create({
        trxId: `TRX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
        discordId: buyer.discordId,
        userId: buyer._id,
        title: `Pembelian Fleet: ${order.fleetStoreId.name}`,
        category: "fleet",
        amount: order.totalPrice,
        currency: "NC",
        status: "success",
        metadata: {
          orderId: order._id,
          fleetStoreId: order.fleetStoreId._id
        }
      });
    }

    // 3. Add admin fee to manager (Hanya jika manager memproses order milik user lain)
    const isSelfPurchase = String(session.user.discordId) === String(buyer.discordId);

    if (!isSelfPurchase && order.adminFee > 0) {
      await db.collection("currencies").updateOne(
        { userId: order.managerId, guildId: GUILD_ID },
        { $inc: { totalNC: order.adminFee } },
        { upsert: true },
      );
      isFeeGiven = true;

      await db.collection("currencyhistories").insertOne({
        userId: order.managerId,
        guildId: GUILD_ID,
        amount: order.adminFee,
        type: "earn",
        reason: `Admin Fee Pembelian Fleet (User: ${buyer.name})`,
        createdAt: new Date(),
      });
    }

    // 4. Create Fleet for user
    const brandName = order.fleetStoreId.brand?.name ? `${order.fleetStoreId.brand.name} ` : "";
    const fleetName = `${brandName}${order.fleetStoreId.name}`.trim();

    const createdFleet = await Fleet.create({
      id: String(truckyId),
      fleet_name: fleetName,
      game_id: String(order.fleetStoreId.game_id),
      fleet_number: platNumber,
      owner: String(buyer._id),
      driver: String(buyer._id),
      model: order.fleetStoreId._id,
      odometer: 0,
      wheels: "4x2",
      status: "active",
      has_insurance: false,
      jobs_count: 0,
      maintenance: order.fleetStoreId.component_cost_unfix_wear || {
        engine: 45000,
        tires: 20000,
        transmission: 80000,
        brakes: 25000,
      },
    });

    createdFleetDbId = String(createdFleet._id);

    // 4.5 Update Garage
    let garage = await Garage.findOne({ discordId: buyer.discordId });

    if (!garage) {
      garage = new Garage({
        discordId: buyer.discordId,
        fleetSlot: 1,
        fleetSlotUsed: 1,
        fleetSlotLevel: 1,
        mechanics: { umum: {}, ban: {}, mesin: {} },
        operational_cost: 0,
      });
      if (order.requiresGarageUpgrade) {
        const slotsToAdd = order.upgradeSlotCount || 1;
        garage.fleetSlot += slotsToAdd;
        garage.fleetSlotLevel += slotsToAdd;
        addedSlots = slotsToAdd;
      }
    } else {
      garage.fleetSlotUsed += 1;
      if (order.requiresGarageUpgrade) {
        const slotsToAdd = order.upgradeSlotCount || 1;
        garage.fleetSlot += slotsToAdd;
        garage.fleetSlotLevel += slotsToAdd;
        addedSlots = slotsToAdd;
      }
    }

    let newFleetOpCost = 0;
    if (garage.fleetSlot > 1) {
      for (let i = 2; i <= garage.fleetSlot; i++) {
        const tier = Math.floor((i - 1) / 3);
        newFleetOpCost += 250 + (tier * 250);
      }
    }
    garage.fleet_operational_cost = newFleetOpCost;
    
    const fuelCost = garage.fuel_operational_cost || 0;
    garage.operational_cost = garage.fleet_operational_cost + fuelCost;
    await garage.save();
    garageUpdated = true;

    // 5. Update Order status
    order.status = "completed";
    await order.save();

    // 6. Delete Discord Channel - Non-blocking
    if (DISCORD_BOT_TOKEN && order.discordChannelId) {
      fetch(
        `https://discord.com/api/v10/channels/${order.discordChannelId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          },
        },
      ).catch(err => console.error("Failed to delete discord order channel:", err));
    }

    try {
      revalidatePath("/dashboard/garage");
      revalidatePath("/dashboard/garage/fleet");
      revalidatePath("/dashboard/manage/fleet/orderlist");
      revalidatePath("/dashboard/manage/fleet/assign");
      revalidatePath("/dashboard/transactions");
    } catch (e) {
      console.error("Failed to revalidate fleet order complete paths", e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Fleet Order Complete Error:", error);
    
    // 🛡️ Comprehensive Rollback
    try {
      const client = await clientPromise;
      const db = client.db();

      if (isDeducted && buyerDiscordId && deductAmount > 0) {
        await db.collection("currencies").updateOne(
          { userId: buyerDiscordId, guildId: GUILD_ID },
          { $inc: { totalNC: deductAmount } }
        );
        await db.collection("currencyhistories").insertOne({
          userId: buyerDiscordId,
          guildId: GUILD_ID,
          amount: deductAmount,
          type: "earn",
          reason: `Rollback Pembelian Fleet Gagal (Order ID: ${orderId})`,
          createdAt: new Date(),
        });
      }

      if (isFeeGiven && managerDiscordId && adminFeeAmount > 0) {
        await db.collection("currencies").updateOne(
          { userId: managerDiscordId, guildId: GUILD_ID },
          { $inc: { totalNC: -adminFeeAmount } }
        );
      }

      if (createdFleetDbId) {
        await Fleet.deleteOne({ _id: createdFleetDbId });
      }

      if (garageUpdated && buyerDiscordId) {
        const garage = await Garage.findOne({ discordId: buyerDiscordId });
        if (garage) {
          garage.fleetSlotUsed = Math.max(0, (garage.fleetSlotUsed || 1) - 1);
          if (addedSlots > 0) {
            garage.fleetSlot = Math.max(1, garage.fleetSlot - addedSlots);
            garage.fleetSlotLevel = Math.max(1, garage.fleetSlotLevel - addedSlots);
          }
          await garage.save();
        }
      }

      if (orderId) {
        await FleetOrder.updateOne(
          { _id: orderId, status: "processing" },
          { $set: { status: "claimed" } }
        );
      }
    } catch (rollbackErr) {
      console.error("Critical Fleet Order Rollback Error:", rollbackErr);
    }

    return NextResponse.json(
      {
        error:
          error.message ||
          "Terjadi kesalahan internal saat menyelesaikan order",
      },
      { status: 500 },
    );
  }
}
