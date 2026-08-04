import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import FleetOrder from "@/lib/models/FleetOrder";
import FleetStore from "@/lib/models/FleetStore";
import Fleet from "@/lib/models/Fleet";
import User from "@/lib/models/User";
import Garage from "@/lib/models/Garage";
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

    const body = await request.json();
    const platNumber = body.platNumber;
    const truckyId = body.truckyId;

    if (!platNumber) {
      return NextResponse.json(
        { error: "Plat kendaraan harus diisi" },
        { status: 400 },
      );
    }

    if (!truckyId) {
      return NextResponse.json(
        { error: "ID Truk (Trucky ID) harus diisi" },
        { status: 400 },
      );
    }

    await dbConnect();

    const client = await clientPromise;
    const db = client.db();

    const order = await FleetOrder.findById(params.id).populate("fleetStoreId");
    if (!order) {
      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 },
      );
    }

    if (order.status !== "claimed") {
      return NextResponse.json(
        {
          error:
            "Order harus diambil (claimed) terlebih dahulu sebelum diselesaikan",
        },
        { status: 400 },
      );
    }

    if (order.managerId !== session.user.discordId) {
      return NextResponse.json(
        {
          error:
            "Hanya manager yang mengambil order ini yang dapat menyelesaikannya",
        },
        { status: 403 },
      );
    }

    const buyer = await User.findById(order.userId);
    if (!buyer) {
      return NextResponse.json(
        { error: "Pembeli tidak ditemukan" },
        { status: 404 },
      );
    }

    // 1. Check buyer's balance
    const buyerCurrency = await db
      .collection("currencies")
      .findOne({ userId: buyer.discordId, guildId: GUILD_ID });
    if (!buyerCurrency || buyerCurrency.totalNC < order.totalPrice) {
      return NextResponse.json(
        {
          error: "Saldo NC pembeli tidak mencukupi saat ini. Beritahu pembeli.",
        },
        { status: 400 },
      );
    }

    // 2. Deduct from buyer
    await db
      .collection("currencies")
      .updateOne(
        { userId: buyer.discordId, guildId: GUILD_ID },
        { $inc: { totalNC: -order.totalPrice } },
      );
    await db.collection("currencyhistories").insertOne({
      userId: buyer.discordId,
      guildId: GUILD_ID,
      amount: order.totalPrice,
      type: "spend",
      reason: `Pembelian Fleet: ${order.fleetStoreId.name}`,
      createdAt: new Date(),
    });

    // 3. Add admin fee to manager
    await db.collection("currencies").updateOne(
      { userId: order.managerId, guildId: GUILD_ID },
      { $inc: { totalNC: order.adminFee } },
      { upsert: true }, // just in case manager currency doesn't exist yet
    );
    await db.collection("currencyhistories").insertOne({
      userId: order.managerId,
      guildId: GUILD_ID,
      amount: order.adminFee,
      type: "earn",
      reason: `Admin Fee Pembelian Fleet (User: ${buyer.name})`,
      createdAt: new Date(),
    });

    // 4. Create Fleet for user
    await Fleet.create({
      id: truckyId,
      fleet_name: order.fleetStoreId.name,
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

    // 4.5 Update Garage
    const OPERATIONAL_COST_PER_SLOT = 250;
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
      // If requiresGarageUpgrade was somehow true without garage existing, apply it
      if (order.requiresGarageUpgrade) {
        garage.fleetSlot += 1;
        garage.fleetSlotLevel += 1;
      }
    } else {
      garage.fleetSlotUsed += 1;
      if (order.requiresGarageUpgrade) {
        garage.fleetSlot += 1;
        garage.fleetSlotLevel += 1;
      }
    }

    garage.operational_cost =
      garage.fleetSlot === 1 ? 0 : garage.fleetSlot * OPERATIONAL_COST_PER_SLOT;
    await garage.save();

    // 5. Update Order status
    order.status = "completed";
    await order.save();

    // 6. Delete Discord Channel
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
    console.error("Fleet Order Complete Error:", error);
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
