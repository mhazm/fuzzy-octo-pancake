import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import User from "@/lib/models/User";
import { sendPersonalNotification } from "@/lib/services/NotificationService";
import dbConnect from "@/lib/mongoose";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const NISMARAPLUS_ROLE_ID = process.env.DISCORD_NISMARAPLUS_ROLE_ID;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const now = new Date();

    // Find users where any of the 3 expiration dates is less than `now` AND their status is currently `true`
    const expiredUsers = await User.find({
      $or: [
        { "nismaraplus.status": true, "nismaraplus.expiredAt": { $lte: now } },
        { "insurance.status": true, "insurance.expiredAt": { $lte: now } },
        { "galleryBan.status": true, "galleryBan.expiredAt": { $lte: now } },
      ],
    });

    let nismaraPlusCount = 0;
    let insuranceCount = 0;
    let galleryBanCount = 0;

    for (const user of expiredUsers) {
      let isModified = false;

      // 1. Check Nismara+
      if (user.nismaraplus?.status === true && user.nismaraplus.expiredAt && user.nismaraplus.expiredAt <= now) {
        user.nismaraplus.status = false;
        user.nismaraplus.startedAt = null;
        user.nismaraplus.expiredAt = null;
        isModified = true;
        nismaraPlusCount++;

        // Remove Discord Role
        if (DISCORD_BOT_TOKEN && GUILD_ID && NISMARAPLUS_ROLE_ID && user.discordId) {
          await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.discordId}/roles/${NISMARAPLUS_ROLE_ID}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            }
          }).catch(err => console.error(`Failed to remove Nismara+ role for ${user.discordId}`, err));
        }

        await sendPersonalNotification(
          user.discordId,
          "Nismara+ Berakhir 👑",
          "Masa aktif langganan Nismara+ Anda telah berakhir. Terima kasih telah berlangganan dan mendukung Nismara! Anda dapat memperbaruinya di halaman pembelian jika ingin menikmati kembali fitur premium.",
          "info",
          "/dashboard"
        );
      }

      // 2. Check Insurance
      if (user.insurance?.status === true && user.insurance.expiredAt && user.insurance.expiredAt <= now) {
        user.insurance.status = false;
        // Keep rating, but reset dates
        user.insurance.startedAt = null;
        user.insurance.expiredAt = null;
        isModified = true;
        insuranceCount++;

        await sendPersonalNotification(
          user.discordId,
          "Asuransi Kedaluwarsa 🛡️",
          "Polis Asuransi Pengemudi Anda telah hangus hari ini! Segera perbarui polis Anda untuk menghindari menanggung 100% biaya jika terjadi kecelakaan.",
          "warning",
          "/dashboard/market?tab=insurance"
        );
      }

      // 3. Check Gallery Ban
      if (user.galleryBan?.status === true && user.galleryBan.expiredAt && user.galleryBan.expiredAt <= now) {
        user.galleryBan.status = false;
        user.galleryBan.expiredAt = null;
        user.galleryBan.reason = null;
        isModified = true;
        galleryBanCount++;

        await sendPersonalNotification(
          user.discordId,
          "Gallery Unbanned ⚖️",
          "Masa hukuman Anda dari Nismara Social Gallery telah selesai. Hak akses Anda untuk memposting telah dipulihkan. Mohon selalu mematuhi peraturan komunitas.",
          "success",
          "/dashboard/gallery"
        );
      }

      if (isModified) {
        await user.save();
      }
    }

    return NextResponse.json({
      success: true,
      processed: {
        nismaraPlusExpiring: nismaraPlusCount,
        insuranceExpiring: insuranceCount,
        galleryBanLifting: galleryBanCount,
      }
    });

  } catch (error: any) {
    console.error("Cron Users Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
