"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import NismaraPlusOrder from "@/lib/models/NismaraPlusOrder";
import Transaction from "@/lib/models/Transaction";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";

export async function createPurchaseTicket(months: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return { success: false, message: "Anda belum login." };
    }

    await dbConnect();
    
    // Cek pesanan pending
    const existingOrder = await NismaraPlusOrder.findOne({
      discordId: session.user.discordId,
      status: "pending"
    });
    
    if (existingOrder) {
      return { success: false, message: "Anda masih memiliki pesanan Nismara+ yang sedang diproses. Mohon selesaikan di tiket sebelumnya." };
    }

    // Validasi input bulan
    const validMonths = [1, 3, 6, 12];
    if (!validMonths.includes(months)) {
      return { success: false, message: "Pilihan paket tidak valid." };
    }

    // Kalkulasi Harga
    let pricePerMonth = 30000;
    if (months === 3) pricePerMonth = 28000;
    else if (months === 6) pricePerMonth = 25000;
    else if (months === 12) pricePerMonth = 23000;

    const totalPrice = pricePerMonth * months;
    const formattedTotal = `Rp ${totalPrice.toLocaleString("id-ID")},-`;
    const formattedPerMonth = `Rp ${pricePerMonth.toLocaleString("id-ID")},-`;

    const discordId = session.user.discordId;
    const username = session.user.name || "driver";
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const categoryId = process.env.DISCORD_PLUS_CATEGORY_ID;
    const managerRoleId = process.env.DISCORD_MANAGER_ROLE_ID;

    if (!botToken || !guildId) {
      return {
        success: false,
        message: "Konfigurasi integrasi Discord belum lengkap.",
      };
    }

    const allowPermissions = (1024 + 2048 + 65536).toString();
    const denyPermissions = (1024).toString();

    const permissionOverwrites = [
      { id: guildId, type: 0, allow: "0", deny: denyPermissions },
      { id: discordId, type: 1, allow: allowPermissions, deny: "0" },
    ];

    if (managerRoleId) {
      permissionOverwrites.push({
        id: managerRoleId,
        type: 0,
        allow: allowPermissions,
        deny: "0",
      });
    }

    // Buat Channel
    const channelResponse = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `➕nplus-${username.toLowerCase().replace(/\s+/g, "-")}`,
          type: 0,
          parent_id: categoryId || null,
          topic: `Channel invoice Nismara+ (${months} Bulan) | ID: ${discordId}`,
          permission_overwrites: permissionOverwrites,
        }),
      },
    );

    const channelData = await channelResponse.json();

    if (!channelResponse.ok) {
      console.error("Discord API Error:", channelData);
      return {
        success: false,
        message: "Gagal membuat channel koordinasi di Discord.",
      };
    }

    const createdChannelId = channelData.id;

    // Kirim Embed Invoice
    await fetch(
      `https://discord.com/api/v10/channels/${createdChannelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `<@${discordId}> | <@&${managerRoleId || ""}>`,
          embeds: [
            {
              title: "✨ Permintaan Aktivasi Nismara+",
              description: `Halo **${username}**, terima kasih telah memilih untuk mendukung operasional Nismara Transport!\n\nSilakan lakukan pembayaran sesuai dengan rincian paket yang Anda pilih di bawah ini:`,
              color: 10181046,
              fields: [
                {
                  name: "📦 Paket yang Dipilih",
                  value: `**${months} Bulan** (${months * 30} Hari)`,
                  inline: true,
                },
                {
                  name: "💵 Total Tagihan",
                  value: `**${formattedTotal}**\n*(Harga dasar: ${formattedPerMonth}/bulan)*`,
                  inline: true,
                },
                {
                  name: "🏦 Metode Pembayaran",
                  value:
                    "• **Bank BSI:** 7340742898 a/n Ihsan Afdhal\n• **Bank BRI:** 7334 0102 6111 532 a/n Ihsan Afdhal\n• **Gopay/Dana:** 089603703792 a/n Ihsan Afdhal ",
                  inline: false,
                },
                {
                  name: "📝 Langkah Selanjutnya",
                  value:
                    "Kirimkan foto/screenshot bukti transfer yang valid di channel ini. Manager kami akan memvalidasi data Anda dan mengaktifkan status **Nismara+** Anda.",
                  inline: false,
                },
              ],
              footer: { text: "Nismara Group Billing System" },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      },
    );
    
    // Simpan ke database
    const userObj = await mongoose.model("User").findOne({ discordId });
    if (userObj) {
      const isExtend = userObj.nismaraplus?.status === true;
      const createdOrder = await NismaraPlusOrder.create({
        discordId,
        userId: userObj._id,
        durationMonths: months,
        amountIDR: totalPrice,
        type: isExtend ? "extend" : "new",
        channelId: createdChannelId,
        status: "pending",
      });

      const trxId = "NP" + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString().slice(-4);
      await Transaction.create({
        trxId,
        discordId,
        userId: userObj._id,
        title: `Pembelian Nismara+ (${months} Bulan)`,
        category: "nismaraplus",
        amount: totalPrice,
        currency: "IDR",
        status: "pending",
        metadata: { orderId: createdOrder._id, durationMonths: months }
      });
    }

    return {
      success: true,
      url: `https://discord.com/channels/${guildId}/${createdChannelId}`,
    };
  } catch (error) {
    console.error("Error creating purchase ticket:", error);
    return { success: false, message: "Terjadi gangguan koneksi pada server." };
  }
}
