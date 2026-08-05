"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Sesuaikan path jika berbeda
import clientPromise from "@/lib/mongodb";
import { revalidatePath } from "next/cache";

export async function buyInsurance() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return { success: false, message: "Anda belum login." };
    }

    const discordId = session.user.discordId;
    const client = await clientPromise;
    const db = client.db();
    const guildId = process.env.DISCORD_GUILD_ID;

    // 1. Ambil data User untuk cek Rating
    const user = await db.collection("users").findOne({ discordId });
    if (!user) return { success: false, message: "Data user tidak ditemukan." };

    const currentRating = user.insurance?.rating ?? 100;

    // 2. Rumus Harga Dinamis (Base: 5000. Jika rating turun, harga naik)
    // Contoh: Jika rating 95 (turun 5), harga = 5000 + (5 * 50) = 5250 NC
    const BASE_PRICE = 5000;
    const penaltyPrice = (100 - currentRating) * 50;
    let finalPrice = BASE_PRICE + penaltyPrice;

    const isBooster = (session.user as any)?.isBooster;
    const isNismaraPlus = (session.user as any)?.nismaraplus?.status === true;
    
    let totalDiscountPercent = 0;
    if (isBooster) totalDiscountPercent += 30;
    if (isNismaraPlus) totalDiscountPercent += 30;

    if (totalDiscountPercent > 0) {
      finalPrice = Math.floor(finalPrice * (1 - totalDiscountPercent / 100));
    }

    // 3. Cek saldo NC
    const userCurrency = await db
      .collection("currencies")
      .findOne({ userId: discordId, guildId });
    if (!userCurrency || userCurrency.totalNC < finalPrice) {
      return {
        success: false,
        message: `Saldo NC Anda tidak cukup. Harga asuransi Anda saat ini: ${finalPrice.toLocaleString("id-ID")} NC (Rating: ${currentRating}/100).`,
      };
    }

    // 4. Potong saldo NC
    await db
      .collection("currencies")
      .updateOne(
        { userId: discordId, guildId },
        { $inc: { totalNC: -finalPrice } },
      );

    // 5. Atur Masa Berlaku (Tambah 30 Hari)
    const now = new Date();
    let newExpiredAt = new Date();

    // Cek apakah user sudah punya asuransi yang masih aktif, jika ya, tambahkan dari sisa harinya
    if (
      user.insurance?.status &&
      user.insurance?.expiredAt &&
      new Date(user.insurance.expiredAt) > now
    ) {
      newExpiredAt = new Date(user.insurance.expiredAt);
      newExpiredAt.setDate(newExpiredAt.getDate() + 30);
    } else {
      // Jika mati/baru beli, mulai dari hari ini + 30 hari
      newExpiredAt.setDate(now.getDate() + 30);
    }

    // 6. Update Database User
    await db.collection("users").updateOne(
      { discordId },
      {
        $set: {
          "insurance.status": true,
          "insurance.startedAt": user.insurance?.startedAt || now,
          "insurance.expiredAt": newExpiredAt,
        },
      },
    );

    // 7. Catat ke point history (opsional tapi disarankan)
    await db.collection("currencyhistories").insertOne({
      guildId,
      userId: discordId,
      type: "remove",
      amount: finalPrice,
      reason: "Pembelian Asuransi Transport (30 Hari)",
      createdAt: now,
    });

    revalidatePath("/dashboard/insurance");
    return {
      success: true,
      message: "Asuransi berhasil diaktifkan/diperpanjang!",
    };
  } catch (error) {
    console.error("Error buying insurance:", error);
    return { success: false, message: "Terjadi kesalahan pada server." };
  }
}
