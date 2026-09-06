import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";
import ManagerSalaryRecord from "@/lib/models/ManagerSalaryRecord";
import User from "@/lib/models/User";
import UserVoucher from "@/lib/models/UserVoucher";
import { grantVoucher } from "@/lib/voucher";
import { sendPersonalNotification } from "@/lib/services/NotificationService";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "863959415702028318";

export interface VoucherRewardTemplate {
  title: string;
  category: "FLEET_MAINTENANCE" | "FLEET_BUY" | "MARKET_MOD" | "GARAGE_UPGRADE" | "NC_BOOSTER";
  discountType: "percentage" | "fixed";
  discountValue: number;
  durationHours?: number;
}

export interface MilestoneTierConfig {
  tier: number;
  label: string;
  bonusNc: number;
  penaltyTickets: number;
  vouchers: VoucherRewardTemplate[];
}

/**
 * Konfigurasi Tangga Milestone (10 s/d 100 Poin)
 * Total akumulasi NC maksimal tepat 100.000 NC (10k Base + 15k di 30pt + 25k di 50pt + 50k di 100pt).
 */
export const MILESTONE_TIERS: MilestoneTierConfig[] = [
  {
    tier: 10,
    label: "Voucher Diskon Servis 50%",
    bonusNc: 0,
    penaltyTickets: 0,
    vouchers: [
      {
        title: "Diskon Servis Armada 50% (Reward Manager)",
        category: "FLEET_MAINTENANCE",
        discountType: "percentage",
        discountValue: 50,
      },
    ],
  },
  {
    tier: 20,
    label: "3 Tiket Penghapus Penalti (Safebox)",
    bonusNc: 0,
    penaltyTickets: 3,
    vouchers: [],
  },
  {
    tier: 30,
    label: "Bonus 15.000 NC",
    bonusNc: 15000,
    penaltyTickets: 0,
    vouchers: [],
  },
  {
    tier: 40,
    label: "Voucher Diskon 25% Beli Armada",
    bonusNc: 0,
    penaltyTickets: 0,
    vouchers: [
      {
        title: "Diskon Beli Armada 25% (Reward Manager)",
        category: "FLEET_BUY",
        discountType: "percentage",
        discountValue: 25,
      },
    ],
  },
  {
    tier: 50,
    label: "Bonus 25.000 NC + Voucher Booster +100% (6 Jam)",
    bonusNc: 25000,
    penaltyTickets: 0,
    vouchers: [
      {
        title: "Voucher Booster +100% NC (6 Jam) (Reward Manager)",
        category: "NC_BOOSTER",
        discountType: "percentage",
        discountValue: 100,
        durationHours: 6,
      },
    ],
  },
  {
    tier: 60,
    label: "Voucher Diskon Servis 100% (Free Servis)",
    bonusNc: 0,
    penaltyTickets: 0,
    vouchers: [
      {
        title: "Free 1x Servis Armada (Reward Manager)",
        category: "FLEET_MAINTENANCE",
        discountType: "percentage",
        discountValue: 100,
      },
    ],
  },
  {
    tier: 70,
    label: "5 Tiket Penghapus Penalti (Safebox)",
    bonusNc: 0,
    penaltyTickets: 5,
    vouchers: [],
  },
  {
    tier: 80,
    label: "Voucher Diskon 50% Beli Armada",
    bonusNc: 0,
    penaltyTickets: 0,
    vouchers: [
      {
        title: "Diskon Beli Armada 50% (Reward Manager)",
        category: "FLEET_BUY",
        discountType: "percentage",
        discountValue: 50,
      },
    ],
  },
  {
    tier: 90,
    label: "3 Tiket Safebox + Voucher Diskon Servis 50%",
    bonusNc: 0,
    penaltyTickets: 3,
    vouchers: [
      {
        title: "Diskon Servis Armada 50% (Reward Manager)",
        category: "FLEET_MAINTENANCE",
        discountType: "percentage",
        discountValue: 50,
      },
    ],
  },
  {
    tier: 100,
    label: "Bonus 50.000 NC + Voucher Diskon 75% Beli Armada + Title Top Manager",
    bonusNc: 50000,
    penaltyTickets: 0,
    vouchers: [
      {
        title: "Diskon Beli Armada 75% (Master Manager Reward)",
        category: "FLEET_BUY",
        discountType: "percentage",
        discountValue: 75,
      },
    ],
  },
];

/**
 * Aturan Infinite Loop untuk poin > 100
 * Tiap kelipatan 10 poin di atas 100: +5.000 NC & +1 Tiket Safebox
 */
export const INFINITE_LOOP_STEP = 10;
export const INFINITE_LOOP_BONUS_NC = 5000;
export const INFINITE_LOOP_PENALTY_TICKETS = 1;

/**
 * Helper rentang tanggal bulan kalender penuh di Asia/Jakarta (WIB)
 */
export function getWibMonthDateRange(monthStr: string) {
  if (!/^\d{4}-\d{2}$/.test(monthStr)) {
    throw new Error("Format bulan harus YYYY-MM (contoh: 2026-08)");
  }
  const [yearStr, mStr] = monthStr.split("-");
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(mStr, 10) - 1; // 0-indexed

  // Start of month: 00:00:00 WIB (UTC+7 -> kurangi 7 jam dari UTC)
  const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  startOfMonth.setUTCHours(startOfMonth.getUTCHours() - 7);

  // End of month: 00:00:00 WIB di awal bulan berikutnya
  const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  endOfMonth.setUTCHours(endOfMonth.getUTCHours() - 7);

  return { startOfMonth, endOfMonth };
}

/**
 * Mendapatkan string bulan berjalan dan bulan lalu dalam format "YYYY-MM" (Asia/Jakarta)
 */
export function getCurrentAndPreviousMonthWib(): { currentMonth: string; previousMonth: string } {
  const now = new Date();
  const jakartaStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // "YYYY-MM-DD"
  const [yearStr, monthStr] = jakartaStr.split("-");
  const currentMonth = `${yearStr}-${monthStr}`;

  let prevYear = parseInt(yearStr, 10);
  let prevMonth = parseInt(monthStr, 10) - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const previousMonth = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  return { currentMonth, previousMonth };
}

/**
 * Kalkulasi total reward berdasarkan perolehan total poin
 */
export function calculateRewardsFromPoints(totalPoints: number, baseSalary: number = 10000) {
  let totalBonusNc = 0;
  let totalPenaltyTickets = 0;
  const unlockedTiers: number[] = [];
  const vouchers: VoucherRewardTemplate[] = [];

  for (const t of MILESTONE_TIERS) {
    if (totalPoints >= t.tier) {
      unlockedTiers.push(t.tier);
      totalBonusNc += t.bonusNc;
      totalPenaltyTickets += t.penaltyTickets;
      vouchers.push(...t.vouchers);
    }
  }

  // Infinite loop (> 100 points)
  let infiniteLoops = 0;
  if (totalPoints > 100) {
    infiniteLoops = Math.floor((totalPoints - 100) / INFINITE_LOOP_STEP);
    if (infiniteLoops > 0) {
      totalBonusNc += infiniteLoops * INFINITE_LOOP_BONUS_NC;
      totalPenaltyTickets += infiniteLoops * INFINITE_LOOP_PENALTY_TICKETS;
    }
  }

  const finalTotalNc = baseSalary + totalBonusNc;

  return {
    baseSalary,
    bonusNc: totalBonusNc,
    totalNc: finalTotalNc,
    penaltyTickets: totalPenaltyTickets,
    vouchers,
    unlockedTiers,
    infiniteLoops,
  };
}

/**
 * Mesin kalkulasi performa KPI Manager untuk periode bulan tertentu
 * Menerapkan filter Anti-Abuse ketat pada seluruh query
 */
export async function calculateManagerPerformance(managerId: string, month: string) {
  const client = await clientPromise;
  const db = client.db();
  const { startOfMonth, endOfMonth } = getWibMonthDateRange(month);

  // 1. Tiket Support (1 Poin/tiket)
  // Anti-abuse: discordId !== managerId (tidak boleh buat tiket sendiri)
  const ticketsHandled = await db.collection("tickets").countDocuments({
    managerId: String(managerId),
    status: { $in: ["resolved", "closed"] },
    discordId: { $ne: String(managerId) },
    updatedAt: { $gte: startOfMonth, $lt: endOfMonth },
  });

  // 2. Order Pembelian Fleet (1 Poin/order)
  // Anti-abuse: buyerId !== managerId
  const fleetOrdersHandled = await db.collection("fleetorders").countDocuments({
    managerId: String(managerId),
    status: "completed",
    buyerId: { $ne: String(managerId) },
    updatedAt: { $gte: startOfMonth, $lt: endOfMonth },
  });

  // 3. Konfirmasi Servis Fleet (1 Poin/servis)
  // Anti-abuse: discordId !== managerId
  const fleetServicesHandled = await db.collection("fleetmaintenanceorders").countDocuments({
    managerId: String(managerId),
    status: { $in: ["completed", "in_service"] },
    discordId: { $ne: String(managerId) },
    $or: [
      { maintenanceStartAt: { $gte: startOfMonth, $lt: endOfMonth } },
      { updatedAt: { $gte: startOfMonth, $lt: endOfMonth } },
    ],
  });

  // 4. Penyelenggaraan Konvoi (Base 2 Poin + 1 Poin per Peserta Terdaftar Luar)
  const convoys = await db
    .collection("convoylobbies")
    .find({
      setBy: String(managerId),
      startDate: { $gte: startOfMonth, $lt: endOfMonth },
    })
    .toArray();

  let convoysHosted = convoys.length;
  let convoyParticipants = 0;
  for (const c of convoys) {
    if (Array.isArray(c.partisipan)) {
      // Anti-abuse: tidak menghitung partisipan yang adalah manager itu sendiri
      const validParticipants = c.partisipan.filter(
        (p: any) => p && p.discordId && String(p.discordId) !== String(managerId)
      );
      convoyParticipants += validParticipants.length;
    }
  }
  const convoyPoints = convoysHosted * 2 + convoyParticipants;

  // 5. Pembuatan Special Contract (5 Poin/kontrak)
  const contractsCreated = await db.collection("contracts").countDocuments({
    setBy: String(managerId),
    $or: [
      { startDate: { $gte: startOfMonth, $lt: endOfMonth } },
      { setAt: { $gte: startOfMonth, $lt: endOfMonth } },
      { createdAt: { $gte: startOfMonth, $lt: endOfMonth } },
    ],
  });
  const contractPoints = contractsCreated * 5;

  // 6. Pembuatan Event NC Boost (5 Poin/event)
  const boostEventsCreated = await db.collection("ncevents").countDocuments({
    setBy: String(managerId),
    $or: [
      { startDate: { $gte: startOfMonth, $lt: endOfMonth } },
      { setAt: { $gte: startOfMonth, $lt: endOfMonth } },
      { createdAt: { $gte: startOfMonth, $lt: endOfMonth } },
    ],
  });
  const boostPoints = boostEventsCreated * 5;

  // 7. Review Mod Market Items (2 Poin/mod)
  // Anti-abuse: sellerId !== managerId
  const modsReviewed = await db.collection("marketitems").countDocuments({
    reviewerId: String(managerId),
    status: { $in: ["approved", "rejected"] },
    sellerId: { $ne: String(managerId) },
    updatedAt: { $gte: startOfMonth, $lt: endOfMonth },
  });
  const modPoints = modsReviewed * 2;

  // 8. Jarak Tempuh Mengemudi Job (1 Poin per 1.000 KM Uncapped)
  const jobStats = await db
    .collection("jobhistories")
    .aggregate([
      {
        $match: {
          driverId: String(managerId),
          jobStatus: "COMPLETED",
          cancelPenaltyApplied: { $ne: true },
          completedAt: { $gte: startOfMonth, $lt: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalDistance: { $sum: "$distanceKm" },
          totalJobs: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const totalKm = jobStats[0]?.totalDistance || 0;
  const totalJobs = jobStats[0]?.totalJobs || 0;
  const distancePoints = Math.floor(totalKm / 1000);

  // 9. Kelulusan Driver Magang / Promosi Intern (3 Poin/kelulusan)
  // Anti-abuse: internDiscordId !== managerId
  const internPromotionsCount = await db.collection("internpromotions").countDocuments({
    managerId: String(managerId),
    internDiscordId: { $ne: String(managerId) },
    promotedAt: { $gte: startOfMonth, $lt: endOfMonth },
  });
  const internPromotionPoints = internPromotionsCount * 3;

  // 10. Audit / Evaluasi Driver Magang (2 Poin/evaluasi)
  // Anti-abuse: driverId !== managerId
  const internEvaluationsCount = await db.collection("driverevaluations").countDocuments({
    closedByManagerId: String(managerId),
    status: "closed",
    driverId: { $ne: String(managerId) },
    closedAt: { $gte: startOfMonth, $lt: endOfMonth },
  });
  const internEvaluationPoints = internEvaluationsCount * 2;

  // Total Poin Keseluruhan
  const totalPoints =
    ticketsHandled +
    fleetOrdersHandled +
    fleetServicesHandled +
    convoyPoints +
    contractPoints +
    boostPoints +
    modPoints +
    distancePoints +
    internPromotionPoints +
    internEvaluationPoints;

  const rewards = calculateRewardsFromPoints(totalPoints, 10000);

  return {
    month,
    managerId,
    totalPoints,
    breakdown: {
      ticketsHandled,
      ticketPoints: ticketsHandled,
      fleetOrdersHandled,
      fleetOrderPoints: fleetOrdersHandled,
      fleetServicesHandled,
      fleetServicePoints: fleetServicesHandled,
      convoysHosted,
      convoyParticipants,
      convoyPoints,
      contractsCreated,
      contractPoints,
      boostEventsCreated,
      boostPoints,
      modsReviewed,
      modPoints,
      distanceKm: totalKm,
      totalJobs,
      distancePoints,
      internPromotionsHandled: internPromotionsCount,
      internPromotionPoints,
      internEvaluationsHandled: internEvaluationsCount,
      internEvaluationPoints,
    },
    rewards,
  };
}

/**
 * Klaim Gaji & Insentif Performa Manager secara Atomik
 */
export async function claimManagerSalary(managerId: string, month: string) {
  await dbConnect();
  const client = await clientPromise;
  const db = client.db();

  // Validasi bulan: hanya boleh klaim bulan lalu atau bulan sebelum-sebelumnya yang belum diklaim
  const { currentMonth } = getCurrentAndPreviousMonthWib();
  if (month >= currentMonth) {
    return {
      success: false,
      error: `Gaji untuk periode bulan berjalan (${month}) baru dapat diklaim mulai tanggal 1 bulan berikutnya.`,
    };
  }

  // 1. Cek User manager
  const user = await User.findOne({ discordId: String(managerId) });
  if (!user) {
    return { success: false, error: "Data pengguna tidak ditemukan." };
  }

  // 2. Cek apakah record sudah pernah diklaim sebelumnya
  const existingRecord = await ManagerSalaryRecord.findOne({
    month,
    managerId: String(managerId),
  });

  if (existingRecord && existingRecord.status === "CLAIMED") {
    return {
      success: false,
      error: `Gaji periode ${month} sudah pernah Anda klaim sebelumnya pada ${existingRecord.claimedAt?.toLocaleString(
        "id-ID",
        { timeZone: "Asia/Jakarta" }
      )} WIB.`,
    };
  }

  // 3. Kalkulasi performa terkini untuk bulan tersebut
  const perf = await calculateManagerPerformance(managerId, month);

  // 4. ATOMIC GATE: Amankan dan kunci status menjadi PROCESSING
  const lockedRecord = await ManagerSalaryRecord.findOneAndUpdate(
    {
      month,
      managerId: String(managerId),
      status: { $ne: "CLAIMED" },
    },
    {
      $set: {
        status: "PROCESSING",
        baseSalary: perf.rewards.baseSalary,
        totalPoints: perf.totalPoints,
        unlockedTiers: perf.rewards.unlockedTiers,
        breakdown: {
          ticketsHandled: perf.breakdown.ticketsHandled,
          fleetOrdersHandled: perf.breakdown.fleetOrdersHandled,
          fleetServicesHandled: perf.breakdown.fleetServicesHandled,
          convoysHosted: perf.breakdown.convoysHosted,
          convoyParticipants: perf.breakdown.convoyParticipants,
          contractsCreated: perf.breakdown.contractsCreated,
          boostEventsCreated: perf.breakdown.boostEventsCreated,
          modsReviewed: perf.breakdown.modsReviewed,
          distanceKm: perf.breakdown.distanceKm,
          distancePoints: perf.breakdown.distancePoints,
          internPromotionsHandled: perf.breakdown.internPromotionsHandled,
          internPromotionPoints: perf.breakdown.internPromotionPoints,
          internEvaluationsHandled: perf.breakdown.internEvaluationsHandled,
          internEvaluationPoints: perf.breakdown.internEvaluationPoints,
        },
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  if (!lockedRecord || lockedRecord.status === "CLAIMED") {
    return {
      success: false,
      error: "Gaji periode ini sedang diproses atau sudah berhasil diklaim oleh sesi lain.",
    };
  }

  const generatedVouchers: any[] = [];
  const createdVoucherIds: any[] = [];
  let ncCredited = false;
  let safeboxCredited = false;
  let topManagerAwarded = false;
  const trxId = `SALARY-${month.replace("-", "")}-${String(managerId).slice(-4)}-${Date.now()
    .toString()
    .slice(-4)}`;

  try {
    // 5. Distribusi NC (Total: Base + Bonus)
    const ncAmount = perf.rewards.totalNc;
    if (ncAmount > 0) {
      await db.collection("currencies").updateOne(
        { userId: String(managerId), guildId: GUILD_ID },
        { $inc: { totalNC: ncAmount } },
        { upsert: true }
      );

      await db.collection("currencyhistories").insertOne({
        userId: String(managerId),
        guildId: GUILD_ID,
        amount: ncAmount,
        type: "earn",
        reason: `Gaji & Insentif Performa Manager Periode ${month} (${perf.totalPoints} Poin)`,
        createdAt: new Date(),
      });
      ncCredited = true;
    }

    // 6. Distribusi Tiket Safebox (Penghapus Penalti)
    if (perf.rewards.penaltyTickets > 0) {
      await db.collection("garages").updateOne(
        { discordId: String(managerId) },
        { $inc: { safeboxStock: perf.rewards.penaltyTickets } },
        { upsert: true }
      );
      safeboxCredited = true;
    }

    // 7. Distribusi Vouchers
    for (const vTemplate of perf.rewards.vouchers) {
      const createdVoucher = await grantVoucher({
        userId: user._id,
        discordId: managerId,
        guildId: GUILD_ID,
        title: vTemplate.title,
        description: `Hadiah performa Manager Nismara Transport periode ${month}`,
        category: vTemplate.category,
        discountType: vTemplate.discountType,
        discountValue: vTemplate.discountValue,
        durationHours: vTemplate.durationHours || 0,
        source: `MANAGER_SALARY_${month}`,
        expiresInDays: 60, // Masa berlaku voucher 60 hari
      });

      if (createdVoucher?._id) {
        createdVoucherIds.push(createdVoucher._id);
      }

      generatedVouchers.push({
        code: createdVoucher.code,
        title: createdVoucher.title,
        category: createdVoucher.category,
        discountValue: createdVoucher.discountValue,
        discountType: createdVoucher.discountType,
      });
    }

    // 7b. Penganugerahan Gelar & UserBadge Top Manager (Jika Capai >= 100 Poin)
    if (perf.totalPoints >= 100) {
      // Masa aktif badge Top Manager berlaku sampai akhir bulan berjalan (WIB)
      const { endOfMonth: activeUntil } = getWibMonthDateRange(currentMonth);
      await db.collection("users").updateOne(
        { discordId: String(managerId) },
        {
          $set: {
            "topManager.status": true,
            "topManager.month": month,
            "topManager.awardedAt": new Date(),
            "topManager.expiredAt": activeUntil,
          },
        }
      );
      topManagerAwarded = true;
    }

    // 8. Selesaikan status record menjadi CLAIMED
    lockedRecord.status = "CLAIMED";
    lockedRecord.claimedAt = new Date();
    lockedRecord.claimedTrxId = trxId;
    lockedRecord.rewardsGranted = {
      ncAmount,
      vouchers: generatedVouchers,
      penaltyTickets: perf.rewards.penaltyTickets,
    };
    await lockedRecord.save();

    // 9. Kirim notifikasi konfirmasi personal (non-fatal, ditangani tersendiri agar kegagalan notifikasi tidak membatalkan klaim yang sudah sah)
    try {
      await sendPersonalNotification(
        String(managerId),
        "Gaji & Bonus Manager Berhasil Diklaim! 🎉",
        `Gaji periode ${month} sebesar ${ncAmount.toLocaleString("id-ID")} NC dan ${
          perf.rewards.penaltyTickets
        } Tiket Safebox telah berhasil dicairkan ke akun Anda.`,
        "success",
        "/dashboard/manage/payroll"
      );
    } catch (notifErr) {
      console.warn("Gagal mengirim notifikasi personal klaim gaji (non-fatal):", notifErr);
    }

    return {
      success: true,
      data: {
        month,
        trxId,
        totalPoints: perf.totalPoints,
        ncAmount,
        penaltyTickets: perf.rewards.penaltyTickets,
        vouchers: generatedVouchers,
        claimedAt: lockedRecord.claimedAt,
      },
    };
  } catch (error: any) {
    console.error("Gagal mendistribusikan reward gaji manager, menjalankan rollback multi-koleksi:", error);

    // Rollback Vouchers yang sempat terbuat
    if (createdVoucherIds.length > 0) {
      try {
        await UserVoucher.deleteMany({ _id: { $in: createdVoucherIds } });
      } catch (rbVoucherErr) {
        console.error("Rollback voucher failed:", rbVoucherErr);
      }
    }

    // Rollback Tiket Safebox
    if (safeboxCredited && perf.rewards.penaltyTickets > 0) {
      try {
        await db.collection("garages").updateOne(
          { discordId: String(managerId) },
          { $inc: { safeboxStock: -perf.rewards.penaltyTickets } }
        );
      } catch (rbSafeboxErr) {
        console.error("Rollback safebox failed:", rbSafeboxErr);
      }
    }

    // Rollback NC
    if (ncCredited && perf.rewards.totalNc > 0) {
      try {
        await db.collection("currencies").updateOne(
          { userId: String(managerId), guildId: GUILD_ID },
          { $inc: { totalNC: -perf.rewards.totalNc } }
        );
        await db.collection("currencyhistories").insertOne({
          userId: String(managerId),
          guildId: GUILD_ID,
          amount: perf.rewards.totalNc,
          type: "spend",
          reason: `[ROLLBACK] Koreksi kegagalan klaim gaji manager periode ${month}`,
          createdAt: new Date(),
        });
      } catch (rbNcErr) {
        console.error("Rollback NC failed:", rbNcErr);
      }
    }

    // Rollback status Top Manager
    if (topManagerAwarded) {
      try {
        await db.collection("users").updateOne(
          { discordId: String(managerId) },
          { $set: { "topManager.status": false } }
        );
      } catch (rbTopMgrErr) {
        console.error("Rollback Top Manager status failed:", rbTopMgrErr);
      }
    }

    // Rollback gate agar user tidak kehilangan hak klaim dan bisa mencoba klaim ulang
    await ManagerSalaryRecord.updateOne(
      { month, managerId: String(managerId) },
      { $set: { status: "UNCLAIMED" } }
    );

    return {
      success: false,
      error: `Terjadi kesalahan saat memproses klaim: ${error.message || "Unknown error"}. Sistem telah melakukan rollback otomatis, hak klaim Anda aman dan dapat dicoba kembali.`,
    };
  }
}
