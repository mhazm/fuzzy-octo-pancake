"use server";

import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { deleteFileFromR2 } from "@/lib/r2";
import Notification from "@/lib/models/Notification";
import dbConnect from "@/lib/mongoose";

const DISCORD_COUPON_CHANNEL_ID = process.env.DISCORD_GENERAL_DRIVER_ID_CHANNEL;

async function sendDiscordCouponMessage(coupon: any) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken || !DISCORD_COUPON_CHANNEL_ID) {
    return;
  }

  const isNC = coupon.type === "NC";
  const rewardText = isNC
    ? `${coupon.minAmount.toLocaleString("id-ID")} - ${coupon.maxAmount.toLocaleString("id-ID")} NC`
    : `${coupon.minAmount} - ${coupon.maxAmount} Tiket`;

  const embed = {
    title: "🎟️ KUPON BARU TERSEDIA!",
    description: `Kupon baru telah diterbitkan! Segera klaim sebelum kedaluwarsa.\n\n**Nama Kupon:** ${coupon.nameCoupon}\n**Kode Kupon:** \`${coupon.codeCoupon}\`\n**Tipe Hadiah:** ${isNC ? "Nismara Coin" : "Tiket Hapus Penalti"}\n**Total Hadiah:** ${rewardText}\n**Durasi:** ${coupon.durationDays || 7} Hari\n\n[🔗 Klik di sini untuk Klaim Kupon!](https://transport.nismara.web.id/coupons/${coupon.codeCoupon})`,
    color: isNC ? 0xfacc15 : 0xef4444,
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
    internRoleId ? `<@&${internRoleId}>` : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    await fetch(
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
  } catch (error) {
    console.error("Discord Coupon API error:", error);
  }
}

export async function createCouponAction(data: {
  nameCoupon: string;
  codeCoupon: string;
  type: "NC" | "PENALTY_TICKET";
  minAmount: number;
  maxAmount: number;
  isScheduled?: boolean;
  startDate?: string;
  endDate: string;
  imageUrl?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role === "user") {
    return { success: false, error: "Unauthorized access" };
  }

  const client = await clientPromise;
  const db = client.db();

  const {
    nameCoupon,
    codeCoupon,
    type,
    minAmount,
    maxAmount,
    isScheduled,
    startDate: startDateString,
    endDate: endDateString,
    imageUrl,
  } = data;

  if (
    !nameCoupon ||
    !codeCoupon ||
    !type ||
    typeof minAmount !== "number" ||
    typeof maxAmount !== "number" ||
    !endDateString ||
    (isScheduled && !startDateString)
  ) {
    return { success: false, error: "Data input tidak lengkap atau tidak valid." };
  }

  // Check unique codeCoupon
  const cleanCode = codeCoupon.trim().toUpperCase();
  const existing = await db.collection("coupons").findOne({
    codeCoupon: { $regex: new RegExp(`^${cleanCode}$`, "i") },
  });

  if (existing) {
    return { success: false, error: "Kode Kupon sudah digunakan, gunakan kode lain." };
  }

  const now = new Date();
  const startDt = isScheduled && startDateString ? new Date(`${startDateString}`) : now;
  const endDt = new Date(`${endDateString}`);

  const isCurrentlyActive = !isScheduled || startDt <= now;
  const isTrulyScheduled = !!isScheduled && startDt > now;
  const durationDays = Math.max(1, Math.ceil((endDt.getTime() - startDt.getTime()) / (1000 * 3600 * 24)));

  const newDoc = {
    guildId: "863959415702028318",
    nameCoupon,
    codeCoupon: cleanCode,
    type,
    minAmount: Number(minAmount),
    maxAmount: Number(maxAmount),
    totalNcClaimed: 0,
    imageUrl: imageUrl || null,
    setBy: session.user.name || "Manager",
    startDate: startDt,
    endDate: endDt,
    durationDays,
    driverClaims: [],
    isActive: isCurrentlyActive,
    isScheduled: isTrulyScheduled,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection("coupons").insertOne(newDoc);

  if (isCurrentlyActive) {
    await sendDiscordCouponMessage(newDoc);

    try {
      await dbConnect();
      const isNC = type === "NC";
      await Notification.create({
        recipient: "global",
        title: "🎟️ Kupon Baru Tersedia!",
        message: `Kupon ${nameCoupon} telah terbit. Hadiah berupa ${
          isNC ? "Nismara Coin" : "Tiket Penghapusan Penalti"
        }. Segera klaim sebelum kedaluwarsa!`,
        type: "info",
        link: `/coupons/${cleanCode}`,
        isRead: false,
      });
    } catch (err) {
      console.error("Global notification error:", err);
    }
  }

  revalidatePath("/dashboard/manage/events/coupon");
  revalidatePath("/coupons");
  return { success: true };
}

export async function updateCouponAction(
  couponId: string,
  data: {
    nameCoupon: string;
    codeCoupon: string;
    type: "NC" | "PENALTY_TICKET";
    minAmount: number;
    maxAmount: number;
    isScheduled?: boolean;
    startDate?: string;
    endDate: string;
    imageUrl?: string;
  }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role === "user") {
    return { success: false, error: "Unauthorized access" };
  }

  const client = await clientPromise;
  const db = client.db();

  const cleanCode = data.codeCoupon.trim().toUpperCase();

  // Check unique code if changed
  const existingSameCode = await db.collection("coupons").findOne({
    _id: { $ne: new ObjectId(couponId) },
    codeCoupon: { $regex: new RegExp(`^${cleanCode}$`, "i") },
  });

  if (existingSameCode) {
    return { success: false, error: "Kode Kupon sudah digunakan oleh kupon lain." };
  }

  const currentCoupon = await db
    .collection("coupons")
    .findOne({ _id: new ObjectId(couponId) });

  if (!currentCoupon) {
    return { success: false, error: "Kupon tidak ditemukan." };
  }

  const now = new Date();
  const startDt = data.isScheduled && data.startDate ? new Date(`${data.startDate}`) : (currentCoupon.startDate || now);
  const endDt = new Date(`${data.endDate}`);
  const isCurrentlyActive = !data.isScheduled || startDt <= now;
  const isTrulyScheduled = !!data.isScheduled && startDt > now;
  const durationDays = Math.max(1, Math.ceil((endDt.getTime() - startDt.getTime()) / (1000 * 3600 * 24)));

  await db.collection("coupons").updateOne(
    { _id: new ObjectId(couponId) },
    {
      $set: {
        nameCoupon: data.nameCoupon,
        codeCoupon: cleanCode,
        type: data.type,
        minAmount: Number(data.minAmount),
        maxAmount: Number(data.maxAmount),
        startDate: startDt,
        endDate: endDt,
        durationDays,
        imageUrl: data.imageUrl || null,
        isActive: isCurrentlyActive,
        isScheduled: isTrulyScheduled,
        updatedAt: new Date(),
      },
    }
  );

  // Storage hygiene: if image was replaced, remove old image
  if (
    currentCoupon.imageUrl &&
    data.imageUrl &&
    currentCoupon.imageUrl !== data.imageUrl
  ) {
    await deleteFileFromR2(currentCoupon.imageUrl);
  }

  revalidatePath("/dashboard/manage/events/coupon");
  revalidatePath("/coupons");
  return { success: true };
}

export async function closeCouponAction(couponId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role === "user") {
    return { success: false, error: "Unauthorized access" };
  }

  const client = await clientPromise;
  const db = client.db();

  await db.collection("coupons").updateOne(
    { _id: new ObjectId(couponId) },
    {
      $set: {
        isActive: false,
        isScheduled: false,
        endDate: new Date(),
        updatedAt: new Date(),
      },
    }
  );

  revalidatePath("/dashboard/manage/events/coupon");
  revalidatePath("/coupons");
  return { success: true };
}

export async function deleteCouponAction(couponId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || session.user.role === "user") {
    return { success: false, error: "Unauthorized access" };
  }

  const client = await clientPromise;
  const db = client.db();

  const existing = await db
    .collection("coupons")
    .findOne({ _id: new ObjectId(couponId) });

  if (existing?.imageUrl) {
    await deleteFileFromR2(existing.imageUrl);
  }

  await db.collection("coupons").deleteOne({ _id: new ObjectId(couponId) });

  revalidatePath("/dashboard/manage/events/coupon");
  revalidatePath("/coupons");
  return { success: true };
}
