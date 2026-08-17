import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import Notification from "@/lib/models/Notification";
import mongoose from "mongoose";

import dbConnect from "@/lib/mongoose";
const DISCORD_COUPON_CHANNEL_ID = process.env.DISCORD_GENERAL_DRIVER_ID_CHANNEL;

async function sendDiscordCouponMessage(coupon: any) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.error("DISCORD_BOT_TOKEN is missing.");
    return;
  }

  const isNC = coupon.type === "NC";
  const rewardText = isNC
    ? `${coupon.minAmount.toLocaleString("id-ID")} - ${coupon.maxAmount.toLocaleString("id-ID")} NC`
    : `${coupon.minAmount} - ${coupon.maxAmount} Tiket`;

  const embed = {
    title: "🎟️ KUPON BARU TERSEDIA!",
    description: `Kupon baru telah diterbitkan! Segera klaim sebelum kedaluwarsa.\n\n**Kode Kupon:** \`${coupon.codeCoupon}\`\n**Tipe Hadiah:** ${isNC ? "Nismara Coin" : "Tiket Hapus Penalti"}\n**Total Hadiah:** ${rewardText}\n**Durasi:** ${coupon.durationDays} Hari\n\n[🔗 Klik di sini untuk Klaim Kupon!](https://transport.nismara.web.id/coupons/${coupon.codeCoupon})`,
    color: isNC ? 0xfacc15 : 0xef4444, // Yellow for NC, Red for Penalty
    image: coupon.imageUrl ? { url: coupon.imageUrl } : undefined,
    timestamp: new Date().toISOString(),
    footer: {
      text: "Nismara Transport - Event System",
    },
  };

  const driverRoleId = process.env.DISCORD_DRIVER_ROLE_ID;
  const internRoleId = process.env.DISCORD_INTERN_ROLE_ID;
  
  const mentions = [
    driverRoleId ? `<@&${driverRoleId}>` : "",
    internRoleId ? `<@&${internRoleId}>` : ""
  ].filter(Boolean).join(" ");

  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${DISCORD_COUPON_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: mentions || undefined,
          embeds: [embed],
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("Failed to send discord message:", res.status, err);
    }
  } catch (error) {
    console.error("Discord API error:", error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Only managers/admins can create coupons
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check (assuming role includes 'manager' or we just check if they are trying to access this route, but better to be safe)
    const userRole = session.user.role?.toLowerCase() || "";
    if (
      !userRole.includes("management") &&
      !userRole.includes("admin") &&
      !userRole.includes("founder") &&
      !userRole.includes("manager")
    ) {
      return NextResponse.json(
        { error: "Forbidden: Management only" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      nameCoupon,
      codeCoupon,
      type,
      minAmount,
      maxAmount,
      endDate: endDateString,
      imageUrl,
    } = body;

    if (
      !nameCoupon ||
      !codeCoupon ||
      !type ||
      typeof minAmount !== "number" ||
      typeof maxAmount !== "number" ||
      !endDateString
    ) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Check unique codeCoupon (case-insensitive)
    const existingCoupon = await db.collection("coupons").findOne({
      codeCoupon: { $regex: new RegExp(`^${codeCoupon}$`, "i") },
    });

    if (existingCoupon) {
      return NextResponse.json(
        { error: "Kode Kupon sudah digunakan, harap gunakan kode lain." },
        { status: 400 }
      );
    }

    const startDate = new Date();
    const endDate = new Date(endDateString);
    
    // Calculate durationDays for the Discord embed
    const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));

    const newCoupon = {
      guildId: "863959415702028318",
      nameCoupon,
      codeCoupon, // Use exact casing provided by user
      type, // 'NC' | 'PENALTY_TICKET'
      minAmount,
      maxAmount,
      totalNcClaimed: 0,
      imageUrl: imageUrl || null,
      setBy: session.user.name || "Manager",
      startDate,
      endDate,
      durationDays,
      driverClaims: [], // Array of { discordId, driverId, amount, claimedAt }
      isActive: true,
    };

    // Save to DB
    const result = await db.collection("coupons").insertOne(newCoupon);

    if (result.acknowledged) {
      // Send Discord Message
      await sendDiscordCouponMessage(newCoupon);

      // Create Global Website Notification
      await dbConnect();

      const isNC = type === "NC";
      await Notification.create({
        recipient: "global",
        title: "🎟️ Kupon Baru Tersedia!",
        message: `Kupon ${nameCoupon} telah terbit. Hadiah berupa ${isNC ? "Nismara Coin" : "Tiket Penghapusan Penalti"}. Segera klaim sebelum kehabisan!`,
        type: "info",
        link: `/coupons/${codeCoupon}`,
        isRead: false,
      });

      return NextResponse.json({ success: true, couponId: result.insertedId });
    } else {
      throw new Error("Failed to insert coupon into database");
    }
  } catch (error: any) {
    console.error("Create Coupon Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
