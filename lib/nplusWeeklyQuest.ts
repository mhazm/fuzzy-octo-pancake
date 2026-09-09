import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";
import { redis } from "@/lib/redis";
import User from "@/lib/models/User";
import Garage from "@/lib/models/Garage";
import NplusQuestTemplate, { INplusQuestTemplate } from "@/lib/models/NplusQuestTemplate";
import NplusWeeklyActiveQuest, { IActiveQuestItem } from "@/lib/models/NplusWeeklyActiveQuest";
import NplusWeeklyQuestClaim from "@/lib/models/NplusWeeklyQuestClaim";
import { grantVoucher } from "@/lib/voucher";

export interface WIBWeekInfo {
  weekKey: string; // e.g. "2026-W36"
  year: number;
  weekNumber: number;
  startDate: Date; // Monday 00:00:00.000 WIB in UTC
  endDate: Date; // Sunday 23:59:59.999 WIB in UTC
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
}

/**
 * Menghitung informasi minggu ISO dalam zona waktu Asia/Jakarta (WIB = UTC+7)
 */
export function getWIBWeekInfo(date: Date = new Date()): WIBWeekInfo {
  // Tambahkan offset UTC+7 untuk mendapatkan waktu kalender Jakarta
  const jakartaOffsetMs = 7 * 60 * 60 * 1000;
  const jakartaTime = new Date(date.getTime() + jakartaOffsetMs);

  const dayOfWeek = jakartaTime.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 1 (Mon) - 7 (Sun)

  // Start of week: Hari Senin 00:00:00.000 WIB
  const startOfWIBWeekJakarta = new Date(jakartaTime);
  startOfWIBWeekJakarta.setUTCDate(jakartaTime.getUTCDate() - (isoDay - 1));
  startOfWIBWeekJakarta.setUTCHours(0, 0, 0, 0);

  // End of week: Hari Minggu 23:59:59.999 WIB
  const endOfWIBWeekJakarta = new Date(startOfWIBWeekJakarta);
  endOfWIBWeekJakarta.setUTCDate(startOfWIBWeekJakarta.getUTCDate() + 6);
  endOfWIBWeekJakarta.setUTCHours(23, 59, 59, 999);

  // Konversi kembali ke UTC asli untuk query database
  const startDateUTC = new Date(startOfWIBWeekJakarta.getTime() - jakartaOffsetMs);
  const endDateUTC = new Date(endOfWIBWeekJakarta.getTime() - jakartaOffsetMs);

  // Hitung ISO Week Number
  const targetThursday = new Date(startOfWIBWeekJakarta);
  targetThursday.setUTCDate(startOfWIBWeekJakarta.getUTCDate() + 3);
  const firstThursdayOfYear = new Date(Date.UTC(targetThursday.getUTCFullYear(), 0, 4));
  const firstThursdayDay = firstThursdayOfYear.getUTCDay() === 0 ? 7 : firstThursdayOfYear.getUTCDay();
  firstThursdayOfYear.setUTCDate(firstThursdayOfYear.getUTCDate() - (firstThursdayDay - 1) + 3);

  const weekNumber = 1 + Math.round((targetThursday.getTime() - firstThursdayOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const year = targetThursday.getUTCFullYear();
  const weekKey = `${year}-W${String(weekNumber).padStart(2, "0")}`;

  // Hitung sisa waktu menuju reset (endDateUTC - date)
  const diffMs = Math.max(0, endDateUTC.getTime() - date.getTime());
  const daysRemaining = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hoursRemaining = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutesRemaining = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

  return {
    weekKey,
    year,
    weekNumber,
    startDate: startDateUTC,
    endDate: endDateUTC,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
  };
}

export const STARTER_QUEST_TEMPLATES = [
  {
    title: "Ekspedisi Penguasa Aspal",
    description: "Selesaikan 5 pekerjaan pengiriman kargo dalam minggu ini.",
    type: "TOTAL_JOBS",
    target: 5,
    difficulty: "EASY",
    reward: {
      type: "VOUCHER",
      title: "Kupon Diskon Servis 50%",
      voucherCategory: "FLEET_MAINTENANCE",
      voucherDiscountType: "percentage",
      voucherDiscountValue: 50,
      description: "Diskon 50% untuk biaya perawatan & servis armada di garasi.",
    },
    isActive: true,
    order: 1,
  },
  {
    title: "Heavy Cargo Specialist",
    description: "Selesaikan 3 pekerjaan dengan muatan kargo berbobot minimal 20 Ton.",
    type: "HEAVY_CARGO",
    target: 3,
    minCargoMass: 20,
    difficulty: "MEDIUM",
    reward: {
      type: "NC",
      title: "10.000 Nismara Coin",
      amount: 10000,
      description: "Bonus 10.000 NC langsung ditambahkan ke saldo akun Anda.",
    },
    isActive: true,
    order: 2,
  },
  {
    title: "Hardcore Master Hauler",
    description: "Selesaikan 2 pekerjaan dalam mode Hardcore (Rating hardcore minimal 4.0).",
    type: "HARDCORE_JOB",
    target: 2,
    difficulty: "HARD",
    reward: {
      type: "SAFEBOX_TICKET",
      title: "3x Tiket Safebox Penebusan Penalti",
      amount: 3,
      description: "3 lembar tiket Safebox untuk menghapus poin penalti driver.",
    },
    isActive: true,
    order: 3,
  },
  {
    title: "Trans-Continental Long Haul",
    description: "Selesaikan 2 pekerjaan dengan jarak tempuh minimal 1.000 KM per job.",
    type: "LONG_HAUL",
    target: 2,
    minDistanceKm: 1000,
    difficulty: "MEDIUM",
    reward: {
      type: "VOUCHER",
      title: "Voucher Booster +50% NC (6 Jam)",
      voucherCategory: "NC_BOOSTER",
      voucherDiscountType: "percentage",
      voucherDiscountValue: 50,
      voucherDurationHours: 6,
      description: "Pengganda pendapatan NC +50% selama 6 jam aktif.",
    },
    isActive: true,
    order: 4,
  },
  {
    title: "Marathon Road King",
    description: "Kumpulkan total akumulasi jarak tempuh minimal 3.000 KM dalam minggu ini.",
    type: "TOTAL_DISTANCE",
    target: 3000,
    difficulty: "MEDIUM",
    reward: {
      type: "FUEL",
      title: "2.500 Liter Bahan Bakar Garasi",
      amount: 2500,
      description: "Stok bahan bakar 2.500 Liter langsung masuk ke tangki garasi.",
    },
    isActive: true,
    order: 5,
  },
  {
    title: "Zero Damage Perfectionist",
    description: "Selesaikan 3 pekerjaan tanpa kerusakan sama sekali (0% Damage kargo & truk).",
    type: "PERFECT_DELIVERY",
    target: 3,
    difficulty: "EASY",
    reward: {
      type: "VOUCHER",
      title: "Kupon Diskon Beli Armada 15%",
      voucherCategory: "FLEET_BUY",
      voucherDiscountType: "percentage",
      voucherDiscountValue: 15,
      description: "Diskon 15% untuk pembelian armada baru di Dealer Fleet.",
    },
    isActive: true,
    order: 6,
  },
  {
    title: "TruckersMP Multiplayer Convoy",
    description: "Selesaikan 3 pekerjaan dalam mode multiplayer TruckersMP bersama komunitas.",
    type: "TRUCKERSMP_JOB",
    target: 3,
    difficulty: "EASY",
    reward: {
      type: "NC",
      title: "15.000 Nismara Coin",
      amount: 15000,
      description: "Bonus 15.000 NC langsung ditambahkan ke saldo akun Anda.",
    },
    isActive: true,
    order: 7,
  },
];

/**
 * Memastikan minimal ada template quest di database
 */
export async function ensureStarterTemplates() {
  await dbConnect();
  const count = await NplusQuestTemplate.countDocuments();
  if (count === 0) {
    await NplusQuestTemplate.insertMany(STARTER_QUEST_TEMPLATES);
  }
}

/**
 * Definisi kelompok tipe quest yang saling tumpang tindih (Overlapping / Free Reward)
 * Pasangan di bawah ini TIDAK BOLEH muncul bersamaan dalam 1 minggu yang sama
 * agar tidak terjadi dobel klaim / free reward tanpa usaha ekstra.
 */
const INCOMPATIBLE_TYPE_PAIRS: [string, string][] = [
  // TOTAL_JOBS dan TRUCKERSMP_JOB sama-sama menghitung kuantitas job murni (job TMP otomatis mengisi Total Job)
  ["TOTAL_JOBS", "TRUCKERSMP_JOB"],
];

function isTypeCompatibleWithSelected(type: string, usedTypes: Set<string>): boolean {
  for (const [typeA, typeB] of INCOMPATIBLE_TYPE_PAIRS) {
    if (type === typeA && usedTypes.has(typeB)) return false;
    if (type === typeB && usedTypes.has(typeA)) return false;
  }
  return true;
}

/**
 * Algoritma pemilihan quest mingguan yang menjamin variasi tipe unik (Quest Type Diversity)
 * Mencegah munculnya 2 quest bertipe sama atau bertipe tumpang tindih (seperti TOTAL_JOBS + TRUCKERSMP_JOB) dalam 1 minggu,
 * dan merotasi variasi target/reward di minggu-minggu berikutnya secara adil dan otomatis.
 */
export function pickDiverseWeeklyQuests(
  templates: any[],
  weekNumber: number,
  countToPick: number = 3
): any[] {
  if (!templates || templates.length === 0) return [];
  const targetCount = Math.min(countToPick, templates.length);

  // 1. Kelompokkan template berdasarkan tipe quest
  const typeGroups = new Map<string, any[]>();
  for (const t of templates) {
    if (!typeGroups.has(t.type)) typeGroups.set(t.type, []);
    typeGroups.get(t.type)!.push(t);
  }

  // 2. Daftar tipe unik
  const uniqueTypes = Array.from(typeGroups.keys());

  // 3. Rotasikan pemilihan tipe quest berdasarkan weekNumber
  const selected: any[] = [];
  const usedTypes = new Set<string>();

  const typeOffset = (weekNumber * 2) % uniqueTypes.length;
  for (let i = 0; i < uniqueTypes.length && selected.length < targetCount; i++) {
    const type = uniqueTypes[(typeOffset + i) % uniqueTypes.length];
    
    // Pastikan tipe belum pernah dipakai DAN kompatibel (tidak tumpang tindih dengan tipe yang sudah dipilih)
    if (!usedTypes.has(type) && isTypeCompatibleWithSelected(type, usedTypes)) {
      const group = typeGroups.get(type)!;
      // Di dalam tipe yang sama, pilih variasi template berdasarkan weekNumber
      const templateOffset = weekNumber % group.length;
      selected.push(group[templateOffset]);
      usedTypes.add(type);
    }
  }

  // 4. Fallback jika slot belum penuh: ambil tipe yang belum terpakai
  if (selected.length < targetCount) {
    for (const type of uniqueTypes) {
      if (selected.length >= targetCount) break;
      if (!usedTypes.has(type) && isTypeCompatibleWithSelected(type, usedTypes)) {
        const group = typeGroups.get(type)!;
        const templateOffset = weekNumber % group.length;
        selected.push(group[templateOffset]);
        usedTypes.add(type);
      }
    }
  }

  // 5. Ultimate fallback (jika pool sangat sedikit)
  if (selected.length < targetCount) {
    const selectedIds = new Set(selected.map((s) => String(s._id)));
    for (const t of templates) {
      if (selected.length >= targetCount) break;
      if (!selectedIds.has(String(t._id))) {
        selected.push(t);
        selectedIds.add(String(t._id));
      }
    }
  }

  return selected;
}

/**
 * Lazy init: Memastikan quest aktif minggu berjalan sudah terinisialisasi
 */
export async function ensureWeeklyQuestsInitialized(referenceDate: Date = new Date()) {
  await dbConnect();
  await ensureStarterTemplates();

  const weekInfo = getWIBWeekInfo(referenceDate);

  let activeWeekly = await NplusWeeklyActiveQuest.findOne({ weekKey: weekInfo.weekKey });
  if (!activeWeekly) {
    // Ambil seluruh template aktif
    const activeTemplates = await NplusQuestTemplate.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    if (activeTemplates.length === 0) {
      throw new Error("Tidak ada template quest aktif yang tersedia di bank soal");
    }

    // Pilih quest mingguan dengan variasi tipe unik (Anti-Duplikasi Tipe)
    const pickedTemplates = pickDiverseWeeklyQuests(activeTemplates, weekInfo.weekNumber, 3);
    const selectedQuests: IActiveQuestItem[] = pickedTemplates.map((template) => ({
      templateId: template._id,
      title: template.title,
      description: template.description,
      type: template.type,
      target: template.target,
      minCargoMass: template.minCargoMass,
      minDistanceKm: template.minDistanceKm,
      reward: template.reward,
      difficulty: template.difficulty,
    }));

    activeWeekly = await NplusWeeklyActiveQuest.create({
      weekKey: weekInfo.weekKey,
      year: weekInfo.year,
      weekNumber: weekInfo.weekNumber,
      startDate: weekInfo.startDate,
      endDate: weekInfo.endDate,
      quests: selectedQuests,
      isManualOverride: false,
    });
  }

  return activeWeekly;
}

export interface UserQuestProgressItem {
  questId: string;
  templateId?: string;
  title: string;
  description: string;
  type: string;
  target: number;
  currentValue: number;
  progressPercentage: number;
  isCompleted: boolean;
  isClaimed: boolean;
  claimedAt?: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  minCargoMass?: number;
  minDistanceKm?: number;
  reward: {
    type: "VOUCHER" | "NC" | "SAFEBOX_TICKET" | "FUEL";
    title: string;
    amount?: number;
    voucherCategory?: string;
    voucherDiscountType?: string;
    voucherDiscountValue?: number;
    voucherDurationHours?: number;
    description?: string;
  };
}

export interface WeeklyQuestProgressResponse {
  success: boolean;
  isNplusActive: boolean;
  nplusExpiredAt?: string | null;
  weekInfo: WIBWeekInfo;
  quests: UserQuestProgressItem[];
  totalCompleted: number;
  totalClaimed: number;
  error?: string;
}

/**
 * Mengambil progress quest mingguan user dengan integrasi Single Aggregation + Redis Cache
 */
export async function getUserWeeklyQuestProgress(
  discordId: string,
  bypassCache: boolean = false
): Promise<WeeklyQuestProgressResponse> {
  const weekInfo = getWIBWeekInfo();
  const cacheKey = `nplus:quest:${discordId}:${weekInfo.weekKey}`;

  // 1. Coba ambil dari Redis Cache
  if (!bypassCache) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn("[WeeklyQuest] Redis cache get failed, proceeding with DB query:", err);
    }
  }

  await dbConnect();
  const client = await clientPromise;
  const db = client.db();

  // 2. Cek status Nismara+ user
  const user = await User.findOne({ discordId: String(discordId) }).lean();
  const now = new Date();
  const nplus = (user as any)?.nismaraplus || { status: false, expiredAt: null };
  const isExpired = nplus.expiredAt ? new Date(nplus.expiredAt) < now : true;
  const isNplusActive = Boolean(nplus.status && !isExpired);

  // 3. Pastikan quest aktif minggu berjalan sudah ada
  const activeWeekly = await ensureWeeklyQuestsInitialized();

  // 4. Ambil data job user di minggu berjalan (Single Fast Aggregation / Find with Projection)
  const userJobs = await db
    .collection("jobhistories")
    .find(
      {
        driverId: String(discordId),
        jobStatus: "COMPLETED",
        completedAt: { $gte: activeWeekly.startDate, $lte: activeWeekly.endDate },
      },
      {
        projection: {
          cargoMass: 1,
          distanceKm: 1,
          damage: 1,
          isHardcore: 1,
          hardcoreRating: 1,
          gameMode: 1,
          completedAt: 1,
        },
      }
    )
    .toArray();

  // 5. Ambil data klaim user di minggu ini
  const claims = await NplusWeeklyQuestClaim.find({
    discordId: String(discordId),
    weekKey: weekInfo.weekKey,
  }).lean();

  const claimMap = new Map<string, any>();
  for (const c of claims) {
    claimMap.set(String(c.questId), c);
  }

  // 6. Hitung progress masing-masing quest
  let totalCompletedCount = 0;
  let totalClaimedCount = 0;

  const questResults: UserQuestProgressItem[] = activeWeekly.quests.map((q: any) => {
    const qId = String(q._id);
    let currentValue = 0;

    switch (q.type) {
      case "TOTAL_JOBS":
        currentValue = userJobs.length;
        break;
      case "TRUCKERSMP_JOB":
        currentValue = userJobs.filter((j) => {
          const mode = String(j.gameMode || "").toLowerCase();
          return mode === "truckersmp" || mode.includes("truckersmp");
        }).length;
        break;
      case "HEAVY_CARGO":
        const minMass = q.minCargoMass || 20;
        currentValue = userJobs.filter((j) => (j.cargoMass || 0) >= minMass).length;
        break;
      case "LONG_HAUL":
        const minDist = q.minDistanceKm || 1000;
        currentValue = userJobs.filter((j) => (j.distanceKm || 0) >= minDist).length;
        break;
      case "TOTAL_DISTANCE":
        currentValue = userJobs.reduce((sum, j) => sum + (j.distanceKm || 0), 0);
        break;
      case "PERFECT_DELIVERY":
        currentValue = userJobs.filter((j) => {
          const d = j.damage || {};
          return (d.vehicle || 0) === 0 && (d.trailer || 0) === 0 && (d.cargo || 0) === 0;
        }).length;
        break;
      case "HARDCORE_JOB":
        currentValue = userJobs.filter(
          (j) => j.isHardcore === true || (j.hardcoreRating && j.hardcoreRating >= 4)
        ).length;
        break;
      default:
        currentValue = 0;
    }

    const isCompleted = currentValue >= q.target;
    const claimRecord = claimMap.get(qId);
    const isClaimed = Boolean(claimRecord);

    if (isCompleted) totalCompletedCount++;
    if (isClaimed) totalClaimedCount++;

    const progressPercentage = Math.min(100, Math.round((currentValue / q.target) * 100));

    return {
      questId: qId,
      templateId: q.templateId ? String(q.templateId) : undefined,
      title: q.title,
      description: q.description,
      type: q.type,
      target: q.target,
      currentValue,
      progressPercentage,
      isCompleted,
      isClaimed,
      claimedAt: claimRecord?.claimedAt ? new Date(claimRecord.claimedAt).toISOString() : null,
      difficulty: q.difficulty || "MEDIUM",
      minCargoMass: q.minCargoMass,
      minDistanceKm: q.minDistanceKm,
      reward: q.reward,
    };
  });

  const rawResponsePayload: WeeklyQuestProgressResponse = {
    success: true,
    isNplusActive,
    nplusExpiredAt: nplus.expiredAt ? new Date(nplus.expiredAt).toISOString() : null,
    weekInfo: {
      ...weekInfo,
      startDate: weekInfo.startDate.toISOString() as any,
      endDate: weekInfo.endDate.toISOString() as any,
    },
    quests: questResults,
    totalCompleted: totalCompletedCount,
    totalClaimed: totalClaimedCount,
  };

  const responsePayload: WeeklyQuestProgressResponse = JSON.parse(JSON.stringify(rawResponsePayload));

  // 7. Simpan ke Redis Cache selama 300 detik (5 menit)
  try {
    await redis.setex(cacheKey, 300, JSON.stringify(responsePayload));
  } catch (err) {
    console.warn("[WeeklyQuest] Redis cache set failed:", err);
  }

  return responsePayload;
}

/**
 * Klaim hadiah quest mingguan oleh member Nismara+
 */
export async function claimWeeklyQuestReward(discordId: string, questId: string) {
  await dbConnect();
  const client = await clientPromise;
  const db = client.db();

  const weekInfo = getWIBWeekInfo();
  const guildId = process.env.DISCORD_GUILD_ID || "863959415702028318";

  // 1. Verifikasi Status Nismara+
  const user = await User.findOne({ discordId: String(discordId) });
  if (!user) {
    return { success: false, error: "Akun user tidak ditemukan." };
  }

  const now = new Date();
  const nplus = user.nismaraplus || { status: false, expiredAt: null };
  const isExpired = nplus.expiredAt ? new Date(nplus.expiredAt) < now : true;
  if (!nplus.status || isExpired) {
    return {
      success: false,
      error: "Fitur Quest Mingguan hanya dapat diklaim oleh Member Nismara Plus yang aktif!",
    };
  }

  // 2. Ambil Quest Aktif Minggu Ini
  const activeWeekly = await ensureWeeklyQuestsInitialized();
  const targetQuest = activeWeekly.quests.find((q: any) => String(q._id) === String(questId));
  if (!targetQuest) {
    return { success: false, error: "Quest tidak ditemukan untuk minggu ini." };
  }

  // 3. Cek apakah sudah pernah diklaim sebelumnya
  const existingClaim = await NplusWeeklyQuestClaim.findOne({
    discordId: String(discordId),
    weekKey: weekInfo.weekKey,
    questId: String(questId),
  });

  if (existingClaim) {
    return { success: false, error: "Hadiah untuk quest ini sudah pernah Anda klaim minggu ini." };
  }

  // 4. Hitung ulang progres murni dari database untuk validasi anti-exploit
  const progressRes = await getUserWeeklyQuestProgress(discordId, true);
  const evaluatedQuest = progressRes.quests.find((q) => q.questId === String(questId));

  if (!evaluatedQuest || !evaluatedQuest.isCompleted) {
    return {
      success: false,
      error: `Syarat quest belum tercapai (${evaluatedQuest?.currentValue || 0} / ${targetQuest.target}).`,
    };
  }

  // 5. ATOMIC CLAIM GUARD: Kunci klaim secara atomik SEBELUM mendistribusikan hadiah!
  // Berkat unique index { discordId: 1, weekKey: 1, questId: 1 }, hanya tepat 1 request yang dapat lolos.
  const reward = targetQuest.reward;
  let claimDoc: any;

  try {
    claimDoc = await NplusWeeklyQuestClaim.create({
      discordId: String(discordId),
      userId: user._id,
      guildId,
      weekKey: weekInfo.weekKey,
      questId: String(questId),
      claimedAt: new Date(),
      rewardSnapshot: {
        type: reward.type,
        title: reward.title,
        amount: reward.amount || 0,
        details: "Pending grant...",
      },
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return { success: false, error: "Hadiah untuk quest ini sudah pernah Anda klaim minggu ini." };
    }
    throw err;
  }

  // 6. Eksekusi Distribusi Hadiah (Hanya request yang memenangkan kunci atomik yang mengeksekusi ini)
  let rewardMessage = "";
  let grantedVoucherId = null;

  try {
    if (reward.type === "NC" && reward.amount && reward.amount > 0) {
      // Tambah saldo NC
      await db.collection("currencies").updateOne(
        { userId: String(discordId), guildId },
        { $inc: { totalNC: reward.amount } },
        { upsert: true }
      );

      // Catat mutasi NC
      await db.collection("currencyhistories").insertOne({
        userId: String(discordId),
        guildId,
        amount: reward.amount,
        type: "earn",
        reason: `Hadiah Quest Mingguan Nismara+ (${weekInfo.weekKey}: ${targetQuest.title})`,
        createdAt: new Date(),
      });

      rewardMessage = `+${reward.amount.toLocaleString("id-ID")} NC`;
    } else if (reward.type === "SAFEBOX_TICKET" && reward.amount && reward.amount > 0) {
      // Tambah Tiket Safebox ke Garasi dengan schema default jika belum ada
      await Garage.updateOne(
        { discordId: String(discordId) },
        { 
          $inc: { safeboxStock: reward.amount },
          $setOnInsert: {
            fleetSlot: 1,
            fleetSlotUsed: 0,
            fleetSlotLevel: 1,
            safeboxLevel: 1,
            fuelCapacity: 2000,
            fuelTankLevel: 1,
            fuelStock: 0,
            operational_cost: 0,
            status: "active",
            createdAt: new Date(),
          }
        },
        { upsert: true }
      );

      rewardMessage = `+${reward.amount}x Tiket Safebox Penebusan Penalti`;
    } else if (reward.type === "FUEL" && reward.amount && reward.amount > 0) {
      // Tambah Fuel ke Garasi dengan schema default jika belum ada
      await Garage.updateOne(
        { discordId: String(discordId) },
        { 
          $inc: { fuelStock: reward.amount },
          $setOnInsert: {
            fleetSlot: 1,
            fleetSlotUsed: 0,
            fleetSlotLevel: 1,
            safeboxLevel: 1,
            fuelCapacity: 2000,
            fuelTankLevel: 1,
            fuelStock: 0,
            operational_cost: 0,
            status: "active",
            createdAt: new Date(),
          }
        },
        { upsert: true }
      );

      rewardMessage = `+${reward.amount.toLocaleString("id-ID")} Liter Bahan Bakar`;
    } else if (reward.type === "VOUCHER" && reward.voucherCategory) {
      // Terbitkan Voucher
      const voucher = await grantVoucher({
        userId: user._id,
        discordId: String(discordId),
        guildId,
        title: reward.title,
        description: reward.description || `Hadiah dari Quest Mingguan Nismara+ ${weekInfo.weekKey}`,
        category: reward.voucherCategory,
        discountType: reward.voucherDiscountType || "percentage",
        discountValue: reward.voucherDiscountValue || 0,
        durationHours: reward.voucherDurationHours || 0,
        source: `NPLUS_WEEKLY_QUEST_${weekInfo.weekKey}`,
        expiresInDays: 30,
      });

      grantedVoucherId = voucher._id;
      rewardMessage = `Voucher: ${reward.title}`;
    }

    // Perbarui snapshot rincian hadiah pada dokumen klaim
    await NplusWeeklyQuestClaim.updateOne(
      { _id: claimDoc._id },
      {
        $set: {
          "rewardSnapshot.voucherId": grantedVoucherId,
          "rewardSnapshot.details": rewardMessage,
        },
      }
    );
  } catch (distributionErr) {
    console.error("[WeeklyQuest] Error during reward distribution, rolling back claimDoc:", distributionErr);
    // 🛡️ ROLLBACK: Hapus claimDoc agar kesempatan klaim user tidak hangus
    try {
      await NplusWeeklyQuestClaim.deleteOne({ _id: claimDoc._id });
    } catch (cleanupErr) {
      console.error("[WeeklyQuest] Rollback delete claimDoc error:", cleanupErr);
    }
    return { success: false, error: "Gagal memberikan hadiah reward. Silakan coba kembali." };
  }

  // 7. Invalidate Redis Cache
  try {
    const cacheKey = `nplus:quest:${discordId}:${weekInfo.weekKey}`;
    await redis.del(cacheKey);
  } catch (err) {
    console.warn("[WeeklyQuest] Redis cache del failed:", err);
  }

  return {
    success: true,
    message: `Selamat! Hadiah berhasil diklaim: ${rewardMessage}`,
    rewardTitle: reward.title,
    rewardDetails: rewardMessage,
  };
}
