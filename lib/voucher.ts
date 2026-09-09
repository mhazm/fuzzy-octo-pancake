import crypto from "crypto";
import mongoose from "mongoose";
import UserVoucher from "@/lib/models/UserVoucher";
import User from "@/lib/models/User";
import dbConnect from "@/lib/mongoose";

export interface GrantVoucherParams {
  userId: string | mongoose.Types.ObjectId;
  discordId: string | number;
  guildId?: string;
  title: string;
  description?: string;
  category: "FLEET_MAINTENANCE" | "FLEET_BUY" | "MARKET_MOD" | "GARAGE_UPGRADE" | "NC_BOOSTER";
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount?: number;
  minSpend?: number;
  durationHours?: number;
  source?: string;
  expiresInDays?: number;
  customCodePrefix?: string;
}

/**
 * Memberikan voucher baru ke akun driver
 */
export async function grantVoucher(params: GrantVoucherParams) {
  await dbConnect();

  const prefix = params.customCodePrefix || (
    params.category === "FLEET_MAINTENANCE" ? "SRV" :
    params.category === "FLEET_BUY" ? "FLT" :
    params.category === "NC_BOOSTER" ? "BST" :
    params.category === "MARKET_MOD" ? "MOD" : "GRG"
  );

  const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
  const code = `VCH-${prefix}-${randomHex}`;

  let expiresAt: Date | null = null;
  if (params.expiresInDays && params.expiresInDays > 0) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + params.expiresInDays);
  }

  const voucher = await UserVoucher.create({
    userId: params.userId,
    discordId: String(params.discordId),
    guildId: params.guildId || process.env.DISCORD_GUILD_ID || "863959415702028318",
    code,
    title: params.title,
    description: params.description || "",
    category: params.category,
    durationHours: params.durationHours || 0,
    discountType: params.discountType,
    discountValue: params.discountValue,
    maxDiscount: params.maxDiscount || 0,
    minSpend: params.minSpend || 0,
    status: "ACTIVE",
    source: params.source || "SEASONAL_PASS",
    expiresAt,
  });

  return voucher;
}

/**
 * Memvalidasi apakah sebuah voucher valid dan bisa digunakan untuk order tertentu
 */
export async function validateVoucher(
  voucherId: string | mongoose.Types.ObjectId,
  discordId: string | number,
  category: "FLEET_MAINTENANCE" | "FLEET_BUY" | "MARKET_MOD" | "GARAGE_UPGRADE",
  eligibleAmount: number
) {
  await dbConnect();

  if (!mongoose.Types.ObjectId.isValid(String(voucherId))) {
    return { valid: false, error: "ID Voucher tidak valid" };
  }

  const voucher = await UserVoucher.findById(voucherId);
  if (!voucher) {
    return { valid: false, error: "Voucher tidak ditemukan" };
  }

  if (voucher.discordId !== String(discordId)) {
    return { valid: false, error: "Voucher ini bukan milik akun Anda" };
  }

  if (voucher.status !== "ACTIVE") {
    return { valid: false, error: `Voucher sudah tidak aktif (Status: ${voucher.status})` };
  }

  if (voucher.category !== category) {
    return { valid: false, error: `Voucher ini hanya berlaku untuk kategori ${voucher.category}` };
  }

  if (voucher.expiresAt && new Date() > new Date(voucher.expiresAt)) {
    // Auto-update status to EXPIRED
    voucher.status = "EXPIRED";
    await voucher.save();
    return { valid: false, error: "Voucher telah kadaluarsa" };
  }

  if (voucher.minSpend > 0 && eligibleAmount < voucher.minSpend) {
    return {
      valid: false,
      error: `Minimal transaksi untuk menggunakan voucher ini adalah ${voucher.minSpend.toLocaleString("id-ID")} NC`,
    };
  }

  return { valid: true, voucher };
}

/**
 * Menghitung nominal diskon voucher
 */
export function calculateVoucherDiscount(eligibleAmount: number, voucher: any): number {
  if (!voucher || eligibleAmount <= 0) return 0;

  let discount = 0;

  if (voucher.discountType === "percentage") {
    discount = Math.round(eligibleAmount * (voucher.discountValue / 100));
    if (voucher.maxDiscount && voucher.maxDiscount > 0) {
      discount = Math.min(discount, voucher.maxDiscount);
    }
  } else if (voucher.discountType === "fixed") {
    discount = Math.min(eligibleAmount, voucher.discountValue);
  }

  return Math.max(0, Math.min(eligibleAmount, discount));
}

/**
 * Mengubah status voucher menjadi USED setelah order dikonfirmasi/dibuat
 */
export async function consumeVoucher(
  voucherId: string | mongoose.Types.ObjectId,
  orderId: string | mongoose.Types.ObjectId,
  discordId: string | number
) {
  await dbConnect();

  const updated = await UserVoucher.findOneAndUpdate(
    { _id: voucherId, discordId: String(discordId), status: "ACTIVE" },
    {
      $set: {
        status: "USED",
        usedAt: new Date(),
        usedOrderId: orderId,
      },
    },
    { returnDocument: "after" }
  );

  return updated;
}

/**
 * Mengembalikan status voucher menjadi ACTIVE jika order dibatalkan atau ditolak
 */
export async function restoreVoucher(voucherId: string | mongoose.Types.ObjectId) {
  await dbConnect();

  const updated = await UserVoucher.findByIdAndUpdate(
    voucherId,
    {
      $set: {
        status: "ACTIVE",
        usedAt: null,
        usedOrderId: null,
      },
    },
    { returnDocument: "after" }
  );

  return updated;
}

/**
 * Mengaktifkan voucher bertipe NC_BOOSTER dan menerapkan status boost ke akun driver
 */
export async function activateBoosterVoucher(
  voucherId: string | mongoose.Types.ObjectId,
  discordId: string | number
) {
  await dbConnect();

  if (!mongoose.Types.ObjectId.isValid(String(voucherId))) {
    return { success: false, error: "ID Voucher tidak valid" };
  }

  const voucher = await UserVoucher.findById(voucherId);
  if (!voucher) {
    return { success: false, error: "Voucher tidak ditemukan" };
  }

  if (voucher.discordId !== String(discordId)) {
    return { success: false, error: "Voucher ini bukan milik akun Anda" };
  }

  if (voucher.status !== "ACTIVE") {
    return { success: false, error: `Voucher sudah tidak aktif (Status: ${voucher.status})` };
  }

  if (voucher.category !== "NC_BOOSTER") {
    return { success: false, error: "Voucher ini bukan kupon NC Booster" };
  }

  if (voucher.expiresAt && new Date() > new Date(voucher.expiresAt)) {
    voucher.status = "EXPIRED";
    await voucher.save();
    return { success: false, error: "Voucher telah kadaluarsa" };
  }

  const durationHours = voucher.durationHours && voucher.durationHours > 0 ? voucher.durationHours : 2;
  const multiplier = (voucher.discountValue || 50) / 100; // e.g. 50 -> 0.5 (+50%)

  const now = new Date();
  const user = await User.findOne({ discordId: String(discordId) });
  if (!user) {
    return { success: false, error: "User tidak ditemukan" };
  }

  // Strict Check: User tidak boleh mengaktifkan booster baru jika masih ada booster yang sedang aktif
  if (
    user.ncBoost &&
    user.ncBoost.active &&
    user.ncBoost.expiredAt &&
    new Date(user.ncBoost.expiredAt) > now
  ) {
    const remainingMinutes = Math.ceil(
      (new Date(user.ncBoost.expiredAt).getTime() - now.getTime()) / 60000
    );
    const timeLeftStr =
      remainingMinutes >= 60
        ? `${Math.floor(remainingMinutes / 60)} jam ${remainingMinutes % 60} menit`
        : `${remainingMinutes} menit`;

    return {
      success: false,
      error: `Anda masih memiliki booster aktif (+${Math.round((user.ncBoost.multiplier || 0) * 100)}% NC) yang tersisa ${timeLeftStr}. Tunggu hingga durasi booster saat ini habis sebelum mengaktifkan voucher baru.`,
    };
  }

  const newExpiredAt = new Date(now.getTime() + durationHours * 3600 * 1000);

  const newBoostData = {
    active: true,
    multiplier,
    startedAt: now,
    expiredAt: newExpiredAt,
    voucherTitle: voucher.title,
    voucherCode: voucher.code,
  };

  // 1. Update profil user terlebih dahulu secara atomic
  await User.updateOne(
    { discordId: String(discordId) },
    { $set: { ncBoost: newBoostData } }
  );

  // 2. Jika user update berhasil, update status voucher menjadi USED
  voucher.status = "USED";
  voucher.usedAt = now;
  await voucher.save();

  return {
    success: true,
    voucher,
    multiplier,
    durationHours,
    expiredAt: newExpiredAt,
  };
}
