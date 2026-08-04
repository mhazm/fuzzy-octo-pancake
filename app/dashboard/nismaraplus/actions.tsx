"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";

export async function createPurchaseTicket(months: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return { success: false, message: "Anda belum login." };
    }

    // Validasi input bulan (mencegah manipulasi dari luar)
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
              description: `Halo **${username}**, terima kasih telah memilih untuk mendukung operasional Nismara Transport!\n\nSembari sistem otomatisasi payment gateway kami (Midtrans) dirilis, silakan lakukan pembayaran manual sesuai dengan rincian paket yang Anda pilih di bawah ini:`,
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
                  name: "🏦 Metode Pembayaran Manual",
                  value:
                    "• **Bank BCA:** 123456789 a/n Nismara Logistics\n• **E-Wallet Dana/Gopay:** 08123456789",
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

    return {
      success: true,
      url: `https://discord.com/channels/${guildId}/${createdChannelId}`,
    };
  } catch (error) {
    console.error("Error creating purchase ticket:", error);
    return { success: false, message: "Terjadi gangguan koneksi pada server." };
  }
}
