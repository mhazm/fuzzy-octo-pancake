"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { revalidatePath } from "next/cache";
import NismaraPlusOrder from "@/lib/models/NismaraPlusOrder";
import Transaction from "@/lib/models/Transaction";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";

export async function searchUsers(query: string) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner =
      session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
      session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;

    if (!session?.user?.discordId || !isOwner) {
      throw new Error("Unauthorized");
    }

    const client = await clientPromise;
    const db = client.db();

    const users = await db
      .collection("users")
      .find({
        $or: [{ name: { $regex: query, $options: "i" } }, { discordId: query }],
      })
      .limit(10)
      .project({ name: 1, discordId: 1, image: 1, nismaraplus: 1 })
      .toArray();

    return {
      success: true,
      data: users.map((u) => ({
        ...u,
        _id: u._id.toString(),
      })),
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Failed to search users",
    };
  }
}

export async function grantOrExtendNismaraPlus(
  discordId: string,
  durationMonths: number,
) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner =
      session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
      session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;

    if (!session?.user?.discordId || !isOwner) {
      throw new Error("Unauthorized");
    }

    const client = await clientPromise;
    const db = client.db();

    const user = await db.collection("users").findOne({ discordId });
    if (!user) throw new Error("User tidak ditemukan");

    const now = new Date();
    const durationMs = durationMonths * 30 * 24 * 60 * 60 * 1000;

    let newStartedAt = now;
    let newExpiredAt = new Date(now.getTime() + durationMs);

    const nismaraplus = user.nismaraplus || {};

    // Jika extend (status aktif dan belum expired)
    if (
      nismaraplus.status &&
      nismaraplus.expiredAt &&
      new Date(nismaraplus.expiredAt) > now
    ) {
      newStartedAt = new Date(nismaraplus.startedAt); // Tetap gunakan start lama
      newExpiredAt = new Date(
        new Date(nismaraplus.expiredAt).getTime() + durationMs,
      );
    }

    await db.collection("users").updateOne(
      { discordId },
      {
        $set: {
          "nismaraplus.status": true,
          "nismaraplus.startedAt": newStartedAt,
          "nismaraplus.expiredAt": newExpiredAt,
        },
      },
    );

    // Discord Bot Integration (Grant Role)
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    const plusRoleId = process.env.DISCORD_NISMARAPLUS_ROLE_ID;

    if (botToken && guildId && plusRoleId) {
      await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${plusRoleId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${botToken}`,
            "X-Audit-Log-Reason": "Nismara+ Subscription (Manual Grant)",
          },
        },
      ).catch((e) => console.error("Discord Role Error:", e));
    }

    revalidatePath("/dashboard/manage/data/nismaraplus");
    return {
      success: true,
      message: `Berhasil menambahkan ${durationMonths} bulan Nismara+ untuk ${user.name || discordId}.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal memproses langganan",
    };
  }
}

export async function revokeNismaraPlus(discordId: string) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner =
      session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
      session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;

    if (!session?.user?.discordId || !isOwner) {
      throw new Error("Unauthorized");
    }

    const client = await clientPromise;
    const db = client.db();

    const user = await db.collection("users").findOne({ discordId });
    if (!user) throw new Error("User tidak ditemukan");

    await db.collection("users").updateOne(
      { discordId },
      {
        $set: {
          "nismaraplus.status": false,
        },
      },
    );

    // Discord Bot Integration (Revoke Role)
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    const plusRoleId = process.env.DISCORD_NISMARAPLUS_ROLE_ID;

    if (botToken && guildId && plusRoleId) {
      await fetch(
        `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${plusRoleId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bot ${botToken}`,
            "X-Audit-Log-Reason": "Nismara+ Revoked",
          },
        },
      ).catch((e) => console.error("Discord Role Revoke Error:", e));
    }

    revalidatePath("/dashboard/manage/data/nismaraplus");
    return {
      success: true,
      message: `Akses Nismara+ untuk ${user.name || discordId} telah dicabut.`,
    };
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mencabut akses" };
  }
}

export async function fetchPendingOrders() {
  try {
    const session = await getServerSession(authOptions);
    const isOwner =
      session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
      session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;
    if (!session?.user?.discordId || !isOwner) {
      throw new Error("Unauthorized");
    }

    await dbConnect();
    const orders = await NismaraPlusOrder.find({ status: "pending" })
      .populate("userId", "name image discordId")
      .sort({ createdAt: 1 });

    return { success: true, data: JSON.parse(JSON.stringify(orders)) };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal mengambil data order",
    };
  }
}

export async function confirmOrder(orderId: string) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner =
      session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
      session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;
    if (!session?.user?.discordId || !isOwner) {
      throw new Error("Unauthorized");
    }

    await dbConnect();
    const order = await NismaraPlusOrder.findById(orderId);
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status !== "pending")
      throw new Error("Order ini tidak dalam status pending");

    const client = await clientPromise;
    const db = client.db();
    const user = await db
      .collection("users")
      .findOne({ discordId: order.discordId });
    if (!user) throw new Error("User tidak ditemukan");

    // 1. Grant/Extend Nismara+
    const now = new Date();
    const durationMs = order.durationMonths * 30 * 24 * 60 * 60 * 1000;

    let newStartedAt = now;
    let newExpiredAt = new Date(now.getTime() + durationMs);
    const nismaraplus = user.nismaraplus || {};

    if (
      nismaraplus.status &&
      nismaraplus.expiredAt &&
      new Date(nismaraplus.expiredAt) > now
    ) {
      newStartedAt = new Date(nismaraplus.startedAt);
      newExpiredAt = new Date(
        new Date(nismaraplus.expiredAt).getTime() + durationMs,
      );
    }

    await db.collection("users").updateOne(
      { discordId: order.discordId },
      {
        $set: {
          "nismaraplus.status": true,
          "nismaraplus.startedAt": newStartedAt,
          "nismaraplus.expiredAt": newExpiredAt,
        },
      },
    );

    // 2. Update Order Status
    order.status = "success";
    order.managerId = session.user.discordId;
    await order.save();

    // 3. Catat di Transaction History
    await Transaction.updateOne(
      { "metadata.orderId": order._id },
      { $set: { status: "success" } },
    );

    // 4. Discord Bot Integration (Grant Role & Send Message)
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    const plusRoleId = process.env.DISCORD_PLUS_ROLE_ID;

    if (botToken && guildId) {
      // a. Grant Role Nismara+ (Cek jika belum punya)
      if (plusRoleId) {
        // Asumsi API Discord PUT idempotent, jika sudah punya tidak error
        await fetch(
          `https://discord.com/api/v10/guilds/${guildId}/members/${order.discordId}/roles/${plusRoleId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bot ${botToken}`,
              "X-Audit-Log-Reason": "Nismara+ Subscription",
            },
          },
        ).catch((e) => console.error("Discord Role Error:", e));
      }

      // b. Send Message to the Ticket Channel
      if (order.channelId) {
        await fetch(
          `https://discord.com/api/v10/channels/${order.channelId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bot ${botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `Halo <@${order.discordId}>! 🎉`,
              embeds: [
                {
                  title: "✅ Pembayaran Berhasil Dikonfirmasi",
                  description: `Terima kasih atas dukungannya! Status **Nismara+** Anda telah ${order.type === "extend" ? "diperpanjang" : "diaktifkan"} untuk durasi **${order.durationMonths} Bulan**.\n\nSelamat menikmati semua keuntungan premium Nismara Transport. Jika Anda memiliki pertanyaan lebih lanjut, Anda dapat bertanya di channel ini.`,
                  color: 3066993, // Green
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
          },
        ).catch((e) => console.error("Discord Msg Error:", e));
      }
    }

    revalidatePath("/dashboard/manage/data/nismaraplus");
    revalidatePath("/dashboard/transactions");
    return {
      success: true,
      message: `Pesanan Nismara+ berhasil dikonfirmasi.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal mengkonfirmasi pesanan",
    };
  }
}

export async function rejectOrder(orderId: string) {
  try {
    const session = await getServerSession(authOptions);
    const isOwner =
      session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
      session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;
    if (!session?.user?.discordId || !isOwner) {
      throw new Error("Unauthorized");
    }

    await dbConnect();
    const order = await NismaraPlusOrder.findById(orderId);
    if (!order) throw new Error("Order tidak ditemukan");
    if (order.status !== "pending")
      throw new Error("Order ini tidak dalam status pending");

    order.status = "rejected";
    order.managerId = session.user.discordId;
    await order.save();

    await Transaction.updateOne(
      { "metadata.orderId": order._id },
      { $set: { status: "failed" } },
    );

    revalidatePath("/dashboard/manage/data/nismaraplus");
    return { success: true, message: `Pesanan Nismara+ berhasil ditolak.` };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal menolak pesanan",
    };
  }
}
