import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import FleetMaintenanceOrder from "@/lib/models/FleetMaintenanceOrder";
import Fleet from "@/lib/models/Fleet";
import Garage from "@/lib/models/Garage";
import "@/lib/models/FleetStore";
import "@/lib/models/User";
import "@/lib/models/FleetBrand";
import { getCurrencyData } from "@/app/dashboard/currency/actions";

import dbConnect from "@/lib/mongoose";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CATEGORY_ID = process.env.DISCORD_PLUS_CATEGORY_ID; // Or any specific category for maintenance
const MANAGER_ROLE_ID = process.env.DISCORD_MANAGER_ROLE_ID;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fleetId, type } = body; // type can be 'maintenance' or 'replace'

    if (!fleetId) {
      return NextResponse.json(
        { error: "fleetId is required" },
        { status: 400 },
      );
    }

    await dbConnect();

    const client = await clientPromise;
    const db = client.db();
    const user = await db
      .collection("users")
      .findOne({ discordId: session.user.discordId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const fleet = await Fleet.findById(fleetId).populate("model");
    if (!fleet) {
      return NextResponse.json({ error: "Fleet not found" }, { status: 404 });
    }

    // Verify ownership
    if (String(fleet.driver) !== String(user._id)) {
      return NextResponse.json(
        { error: "Anda bukan driver kendaraan ini" },
        { status: 403 },
      );
    }

    // Prevent spam: Check if user already has a pending/waiting maintenance order for this fleet
    const existingOrder = await FleetMaintenanceOrder.findOne({
      fleetId: fleet._id,
      status: { $in: ["pending", "waiting", "in_service"] },
    });

    if (existingOrder) {
      return NextResponse.json(
        { error: "Kendaraan ini sudah dalam proses servis atau menunggu." },
        { status: 400 },
      );
    }

    // Server-side calculation of needs and costs
    const odometer = fleet.odometer || 0;

    const baseIntervals = {
      engine: 45000,
      tires: 20000,
      transmission: 60000,
      brakes: 35000,
    };

    const maintenanceCost = fleet.model?.component_cost_maintenance || {
      engine: 2000,
      tires: 500,
      transmission: 1500,
      brakes: 800,
    };

    const replaceCost = fleet.model?.component_cost_unfix_wear || {
      engine: 40000,
      tires: 30000,
      transmission: 60000,
      brakes: 40000,
    };

    const thresholds = fleet.maintenance || baseIntervals;

    const needsEngine = odometer >= thresholds.engine;
    const needsTires = odometer >= thresholds.tires;
    const needsTransmission = odometer >= thresholds.transmission;
    const needsBrakes = odometer >= thresholds.brakes;

    if (!needsEngine && !needsTires && !needsTransmission && !needsBrakes) {
      return NextResponse.json(
        { error: "Kendaraan belum membutuhkan servis." },
        { status: 400 },
      );
    }

    const isReplace = type === "replace";

    const totalComponentCost = isReplace
      ? (needsEngine ? replaceCost.engine : 0) +
        (needsTires ? replaceCost.tires : 0) +
        (needsTransmission ? replaceCost.transmission : 0) +
        (needsBrakes ? replaceCost.brakes : 0)
      : (needsEngine ? maintenanceCost.engine : 0) +
        (needsTires ? maintenanceCost.tires : 0) +
        (needsTransmission ? maintenanceCost.transmission : 0) +
        (needsBrakes ? maintenanceCost.brakes : 0);

    const adminFee = 500;
    const totalPrice = totalComponentCost + adminFee;

    // Fetch garage to check mechanics
    const garage = await Garage.findOne({ discordId: session.user.discordId });
    const mechanics = garage?.mechanics || {};

    let serviceDuration = 0;

    // Helper to calculate boosted duration
    const getBoostedDuration = (
      baseDuration: number,
      specialty: "umum" | "ban" | "mesin",
    ) => {
      const boost = mechanics[specialty]?.boostPercentage || 0;
      if (boost > 0) {
        // e.g. 10 days with 20% boost -> 10 * (1 - 0.20) = 8 days
        const boosted = baseDuration * (1 - boost / 100);
        return Math.max(1, Math.round(boosted)); // Minimum 1 day
      }
      return baseDuration;
    };

    if (isReplace) {
      if (needsEngine) serviceDuration += getBoostedDuration(9, "mesin");
      if (needsTires) serviceDuration += getBoostedDuration(3, "ban");
      if (needsTransmission) serviceDuration += getBoostedDuration(15, "mesin"); // Transmission falls under mesin usually
      if (needsBrakes) serviceDuration += getBoostedDuration(3, "umum"); // Brakes under umum
    } else {
      if (needsEngine) serviceDuration += getBoostedDuration(3, "mesin");
      if (needsTires) serviceDuration += getBoostedDuration(1, "ban");
      if (needsTransmission) serviceDuration += getBoostedDuration(5, "mesin");
      if (needsBrakes) serviceDuration += getBoostedDuration(1, "umum");
    }

    // Check balance
    const currencyData = await getCurrencyData();
    if (currencyData.balance < totalPrice) {
      return NextResponse.json(
        { error: "Saldo NC tidak mencukupi untuk servis ini" },
        { status: 400 },
      );
    }

    // 1. Create Discord Channel
    const channelName = `🔧│Service-${fleet.fleet_number.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;

    const createChannelRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: channelName,
          type: 0,
          parent_id: CATEGORY_ID,
          permission_overwrites: [
            {
              id: GUILD_ID,
              type: 0,
              deny: "1024",
            },
            {
              id: user.discordId,
              type: 1,
              allow: "68608",
            },
            {
              id: MANAGER_ROLE_ID,
              type: 0,
              allow: "68608",
            },
          ],
        }),
      },
    );

    if (!createChannelRes.ok) {
      const err = await createChannelRes.text();
      console.error("Discord API Error (Create Channel):", err);
      return NextResponse.json(
        { error: "Gagal membuat tiket Discord" },
        { status: 500 },
      );
    }

    const channelData = await createChannelRes.json();
    const discordChannelId = channelData.id;

    // 2. Post initial message to the channel
    const partsArray = [];
    if (needsEngine) partsArray.push("Mesin");
    if (needsTires) partsArray.push("Ban");
    if (needsTransmission) partsArray.push("Transmisi");
    if (needsBrakes) partsArray.push("Rem");

    await fetch(
      `https://discord.com/api/v10/channels/${discordChannelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `<@${user.discordId}> permintaan ${isReplace ? "penggantian komponen" : "servis"} kendaraan Anda sedang diproses. Mohon tunggu <@&${MANAGER_ROLE_ID}> untuk mengonfirmasi.`,
          embeds: [
            {
              title: isReplace
                ? "🔄 Permintaan Penggantian Komponen"
                : "🔧 Permintaan Servis Kendaraan",
              color: 0xf59e0b, // amber color
              fields: [
                {
                  name: "Kendaraan",
                  value: `${fleet.model.name} (${fleet.fleet_number})`,
                  inline: false,
                },
                {
                  name: "Komponen",
                  value: partsArray.join(", "),
                  inline: true,
                },
                {
                  name: "Durasi Estimasi",
                  value: `${serviceDuration} Hari`,
                  inline: true,
                },
                {
                  name: "Biaya Komponen",
                  value: `${totalComponentCost.toLocaleString("id-ID")} NC`,
                  inline: false,
                },
                {
                  name: "Biaya Admin",
                  value: `${adminFee.toLocaleString("id-ID")} NC`,
                  inline: true,
                },
                {
                  name: "Total Bayar",
                  value: `**${totalPrice.toLocaleString("id-ID")} NC**`,
                  inline: true,
                },
              ],
            },
          ],
        }),
      },
    );

    // 3. Save Order to Database
    const newOrder = await FleetMaintenanceOrder.create({
      userRef: user._id,
      discordId: user.discordId,
      fleetId: fleet._id,
      type: isReplace ? "replace" : "maintenance",
      status: "pending",
      managerId: null,
      discordChannelId: discordChannelId,
      components: {
        engine: needsEngine,
        tires: needsTires,
        transmission: needsTransmission,
        brakes: needsBrakes,
      },
      basePrice: totalComponentCost,
      adminFee,
      totalPrice,
      serviceDuration,
    });

    return NextResponse.json({ success: true, order: newOrder });
  } catch (error) {
    console.error("Fleet Maintenance Order Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 },
    );
  }
}
