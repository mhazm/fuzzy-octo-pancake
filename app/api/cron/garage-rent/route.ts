import { NextResponse } from "next/server";
import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import Garage from "@/lib/models/Garage";

import dbConnect from "@/lib/mongoose";
const GUILD_ID = "863959415702028318";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

async function sendDiscordDM(discordId: string, message: string) {
  if (!DISCORD_BOT_TOKEN) return;

  try {
    const dmChannelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ recipient_id: discordId })
    });

    if (!dmChannelRes.ok) return;

    const dmChannel = await dmChannelRes.json();

    await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content: message })
    });
  } catch (error) {
    console.error("Failed to send Discord DM:", error);
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const client = await clientPromise;
    const db = client.db();
    const now = new Date();

    // Cari garasi yang waktu bayarnya sudah lewat atau sama dengan sekarang
    const dueGarages = await Garage.find({
      next_payment_date: { $lte: now }
    });

    let processedCount = 0;
    let failedCount = 0;

    for (const garage of dueGarages) {
      // Jika cost 0, langsung perpanjang saja 30 hari tanpa potong saldo (misal slot 1 gratis)
      if (garage.operational_cost <= 0) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30);
        garage.next_payment_date = nextDate;
        await garage.save();
        processedCount++;
        continue;
      }

      // Check user currency
      const userCurrency = await db.collection("currencies").findOne({ userId: garage.discordId, guildId: GUILD_ID });
      
      if (!userCurrency || userCurrency.totalNC < garage.operational_cost) {
        // Gagal bayar karena saldo kurang
        failedCount++;
        
        // Kirim notifikasi peringatan
        await sendDiscordDM(
          garage.discordId,
          `⚠️ **PERINGATAN GARASI!** ⚠️\nSaldo NC Anda tidak mencukupi untuk membayar biaya operasional garasi bulanan sebesar **${garage.operational_cost.toLocaleString('id-ID')} NC**. Harap segera isi saldo Anda agar kendaraan dan garasi Anda tetap dapat beroperasi normal!`
        );
        
        // Kita bisa extend 1 hari ke depan agar tidak terus-terusan spam notifikasi setiap cron jalan
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 1);
        garage.next_payment_date = nextDate;
        await garage.save();
        
      } else {
        // Berhasil bayar
        await db.collection("currencies").updateOne(
          { userId: garage.discordId, guildId: GUILD_ID },
          { $inc: { totalNC: -garage.operational_cost } }
        );

        await db.collection("currencyhistories").insertOne({
          userId: garage.discordId,
          guildId: GUILD_ID,
          amount: garage.operational_cost,
          type: "spend",
          reason: `Biaya Operasional Garasi Bulanan`,
          createdAt: new Date(),
        });

        // Perpanjang 30 hari ke depan
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30);
        garage.next_payment_date = nextDate;
        await garage.save();

        processedCount++;

        // Kirim notifikasi sukses
        await sendDiscordDM(
          garage.discordId,
          `✅ **Pembayaran Garasi Sukses!**\nBiaya operasional garasi sebesar **${garage.operational_cost.toLocaleString('id-ID')} NC** telah dipotong dari saldo Anda untuk 30 hari ke depan.`
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      processedPayments: processedCount,
      failedPayments: failedCount
    });

  } catch (error: any) {
    console.error("Cron Garage Rent Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
