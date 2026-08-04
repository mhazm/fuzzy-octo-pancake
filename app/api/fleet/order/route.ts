import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import FleetOrder from "@/lib/models/FleetOrder";
import FleetStore from "@/lib/models/FleetStore";
import { getCurrencyData } from "@/app/dashboard/currency/actions";

import dbConnect from "@/lib/mongoose";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CATEGORY_ID = process.env.DISCORD_PLUS_CATEGORY_ID;
const MANAGER_ROLE_ID = process.env.DISCORD_MANAGER_ROLE_ID;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fleetStoreId, requiresGarageUpgrade = false } = await request.json();
    if (!fleetStoreId) {
      return NextResponse.json({ error: "fleetStoreId is required" }, { status: 400 });
    }

    await dbConnect();

    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection("users").findOne({ discordId: session.user.discordId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const storeItem = await FleetStore.findById(fleetStoreId).populate("brand");
    if (!storeItem) {
      return NextResponse.json({ error: "Fleet Store item not found" }, { status: 404 });
    }

    // Pricing calculation
    const basePrice = storeItem.price;
    const adminFee = 500;
    
    let nismaraPlusDiscount = 0;
    let boosterDiscount = 0;
    
    const upgradeFee = requiresGarageUpgrade ? 1000 : 0;
    
    if (user.nismaraplus?.status === true) nismaraPlusDiscount = basePrice * 0.20;
    if (user.isBooster === true) boosterDiscount = basePrice * 0.20;
    
    const totalPrice = basePrice - nismaraPlusDiscount - boosterDiscount + adminFee + upgradeFee;

    // Check balance
    const currencyData = await getCurrencyData();
    if (currencyData.balance < totalPrice) {
      return NextResponse.json({ error: "Saldo NC tidak mencukupi" }, { status: 400 });
    }

    // Prevent spam: Check if user already has a pending order
    const existingOrder = await FleetOrder.findOne({
      userId: String(user._id),
      status: { $in: ["pending", "claimed"] }
    });

    if (existingOrder) {
      return NextResponse.json({ error: "Anda masih memiliki pesanan yang belum selesai." }, { status: 400 });
    }

    // 1. Create Discord Channel
    const channelName = `order-${user.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`;
    
    const createChannelRes = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: channelName,
        type: 0, // GUILD_TEXT
        parent_id: CATEGORY_ID,
        permission_overwrites: [
          {
            id: GUILD_ID, // @everyone role (id = guildId)
            type: 0, // role
            deny: "1024" // VIEW_CHANNEL
          },
          {
            id: user.discordId,
            type: 1, // member
            allow: "11264" // VIEW_CHANNEL (1024) + SEND_MESSAGES (2048) + READ_MESSAGE_HISTORY (65536) wait, 1024|2048 = 3072, let's just use "68608" (VIEW_CHANNEL + SEND_MESSAGES + READ_MESSAGE_HISTORY)
          },
          {
            id: MANAGER_ROLE_ID,
            type: 0, // role
            allow: "68608" 
          }
        ]
      })
    });

    if (!createChannelRes.ok) {
      const err = await createChannelRes.text();
      console.error("Discord API Error (Create Channel):", err);
      return NextResponse.json({ error: "Gagal membuat tiket Discord" }, { status: 500 });
    }

    const channelData = await createChannelRes.json();
    const discordChannelId = channelData.id;

    // 2. Post initial message to the channel
    await fetch(`https://discord.com/api/v10/channels/${discordChannelId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: `<@${user.discordId}> pesanan Anda sedang diproses. Mohon tunggu <@&${MANAGER_ROLE_ID}> untuk mengambil order ini.`,
        embeds: [{
          title: "🧾 Detail Pemesanan Fleet Baru",
          color: 0x6D28D9, // primary color
          fields: [
            { name: "Kendaraan", value: `${storeItem.brand?.name} ${storeItem.name}`, inline: true },
            { name: "Tipe", value: storeItem.type.toUpperCase(), inline: true },
            { name: "Harga Dasar", value: `${basePrice.toLocaleString("id-ID")} NC`, inline: false },
            { name: "Biaya Admin", value: `${adminFee.toLocaleString("id-ID")} NC`, inline: true },
            ...(requiresGarageUpgrade ? [{ name: "Upgrade Slot Garasi", value: "1.000 NC", inline: true }] : []),
            { name: "Total Bayar", value: `**${totalPrice.toLocaleString("id-ID")} NC**`, inline: true }
          ]
        }]
      })
    });

    // 3. Save Order to Database
    const newOrder = await FleetOrder.create({
      userId: String(user._id),
      discordId: user.discordId,
      fleetStoreId: storeItem._id,
      status: "pending",
      managerId: null,
      discordChannelId: discordChannelId,
      basePrice,
      adminFee,
      nismaraPlusDiscount,
      boosterDiscount,
      totalPrice,
      requiresGarageUpgrade,
    });

    return NextResponse.json({ success: true, order: newOrder });

  } catch (error) {
    console.error("Fleet Order Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
