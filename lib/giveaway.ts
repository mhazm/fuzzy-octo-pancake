import crypto from "crypto";
import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import { redis } from "@/lib/redis";
import Giveaway, { IGiveaway, GiveawayRewardItem, GiveawayWinner } from "@/lib/models/Giveaway";
import GiveawayTicket from "@/lib/models/GiveawayTicket";
import User from "@/lib/models/User";
import UserVoucher from "@/lib/models/UserVoucher";
import Garage from "@/lib/models/Garage";
import { checkRateLimit } from "@/lib/rateLimit";
import { resolveQuestDescription } from "@/lib/giveawayUtils";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "863959415702028318";

export interface UserQuestProgressItem {
  questId: string;
  title: string;
  description: string;
  type: string;
  target: number;
  currentValue: number;
  progressPercentage: number;
  isCompleted: boolean;
  isClaimed: boolean;
  claimedAt?: string | null;
  rewardTickets: number;
}

export interface UserGiveawayProgressResponse {
  success: boolean;
  error?: string;
  isNplusActive: boolean;
  isBooster: boolean;
  effectiveTicketPrice: number;
  baseTicketPrice: number;
  discountApplied: boolean;
  maxPurchasableTickets: number;
  purchasedTicketsCount: number;
  questTicketsCount: number;
  totalUserTickets: number;
  userTickets: string[]; // List of ticket numbers owned by user
  quests: UserQuestProgressItem[];
}

/**
 * Mengambil ringkasan progres quest dan tiket giveaway untuk seorang user.
 * Terintegrasi dengan Redis cache 60 detik untuk performa super cepat.
 */
export async function getUserGiveawayProgress(
  giveawayId: string,
  discordId: string,
  bypassCache: boolean = false
): Promise<UserGiveawayProgressResponse> {
  const cacheKey = `giveaway:user:${giveawayId}:${discordId}`;

  if (!bypassCache && redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      // Abaikan redis error, lanjut ke db
    }
  }

  const client = await clientPromise;
  const db = client.db();

  // 1. Ambil data giveaway
  const giveaway = await Giveaway.findById(giveawayId).lean();
  if (!giveaway) {
    throw new Error("Giveaway tidak ditemukan");
  }

  // 2. Ambil profil user untuk cek status Nismara+ & Discord Server Booster
  const user = await User.findOne({ discordId: String(discordId) }).lean();
  const now = new Date();
  const nplus = (user as any)?.nismaraplus || { status: false, expiredAt: null };
  const isNplusExpired = nplus.expiredAt ? new Date(nplus.expiredAt) < now : true;
  const isNplusActive = Boolean(nplus.status && !isNplusExpired);
  const isBooster = Boolean((user as any)?.isBooster);

  // Perhitungan diskon 20% jika Nismara+ atau Discord Booster
  const discountPercent = (isNplusActive || isBooster) ? (giveaway.discountNPlusAndBooster || 20) : 0;
  const baseTicketPrice = giveaway.ticketPriceNC || 1000;
  const effectiveTicketPrice = discountPercent > 0
    ? Math.round(baseTicketPrice * (1 - discountPercent / 100))
    : baseTicketPrice;

  // 3. Ambil tiket yang sudah dimiliki user di giveaway ini
  const userTicketsDocs = await GiveawayTicket.find({
    giveawayId,
    discordId: String(discordId),
  }).lean();

  const userTickets = userTicketsDocs.map((t: any) => String(t.ticketNumber));
  const questTicketsCount = userTicketsDocs.filter((t: any) => t.sourceType === "QUEST").length;
  const purchasedTicketsCount = userTicketsDocs.filter((t: any) => t.sourceType === "NC_PURCHASE").length;
  const totalUserTickets = userTicketsDocs.length;

  // Map klaim quest yang sudah pernah dilakukan user
  const claimedQuestMap = new Map<string, any>();
  for (const t of userTicketsDocs) {
    if (t.sourceType === "QUEST" && t.questId) {
      claimedQuestMap.set(String(t.questId), t);
    }
  }

  // 4. Jika quest diaktifkan, ambil job histories user di rentang event
  let userJobs: any[] = [];
  if (giveaway.enableQuests && giveaway.quests && giveaway.quests.length > 0) {
    userJobs = await db
      .collection("jobhistories")
      .find(
        {
          driverId: String(discordId),
          jobStatus: "COMPLETED",
          completedAt: { $gte: new Date(giveaway.startDate), $lte: new Date(giveaway.endDate) },
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
  }

  // 5. Kalkulasi progres masing-masing quest
  const questItems: UserQuestProgressItem[] = (giveaway.quests || []).map((q: any) => {
    const qId = String(q.questId);
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
      case "LONG_HAUL":
        const minDist = q.minDistanceKm || 1000;
        currentValue = userJobs.filter((j) => (j.distanceKm || 0) >= minDist).length;
        break;
      case "HEAVY_CARGO":
        const minMass = q.minCargoMass || 20;
        currentValue = userJobs.filter((j) => (j.cargoMass || 0) >= minMass).length;
        break;
      case "PERFECT_DELIVERY":
        currentValue = userJobs.filter((j) => {
          const d = j.damage || {};
          return (d.vehicle || 0) === 0 && (d.trailer || 0) === 0 && (d.cargo || 0) === 0;
        }).length;
        break;
      default:
        currentValue = 0;
    }

    const isCompleted = currentValue >= (q.target || 1);
    const claimRecord = claimedQuestMap.get(qId);
    const isClaimed = Boolean(claimRecord);
    const progressPercentage = Math.min(100, Math.round((currentValue / (q.target || 1)) * 100));

    return {
      questId: qId,
      title: q.title,
      description: resolveQuestDescription(q),
      type: q.type,
      target: q.target || 1,
      currentValue,
      progressPercentage,
      isCompleted,
      isClaimed,
      claimedAt: claimRecord?.createdAt ? new Date(claimRecord.createdAt).toISOString() : null,
      rewardTickets: q.rewardTickets || 1,
    };
  });

  const response: UserGiveawayProgressResponse = {
    success: true,
    isNplusActive,
    isBooster,
    effectiveTicketPrice,
    baseTicketPrice,
    discountApplied: discountPercent > 0,
    maxPurchasableTickets: giveaway.maxPurchasableTickets ?? 5,
    purchasedTicketsCount,
    questTicketsCount,
    totalUserTickets,
    userTickets,
    quests: questItems,
  };

  // Simpan ke Redis selama 60 detik
  if (redis) {
    try {
      await redis.set(cacheKey, JSON.stringify(response), "EX", 60);
    } catch (err) {
      // ignore
    }
  }

  return response;
}

/**
 * Menerbitkan satu tiket undian dengan perlindungan benturan konkurensi (Concurrency Collision Retry).
 * Jika ada 2+ user mengklaim/membeli di milidetik yang sama sehingga terjadi duplicate key error (E11000),
 * sistem akan secara otomatis mencoba nomor urut berikutnya hingga 5 kali tanpa menggagalkan transaksi user.
 */
async function issueTicketWithRetry(
  giveawayId: string,
  discordId: string,
  sourceType: "QUEST" | "NC_PURCHASE" | "ADMIN_GRANT",
  costNC: number = 0,
  questId: string | null = null,
  maxRetries: number = 5
): Promise<string> {
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Ambil nomor tiket kandidat berdasarkan jumlah tiket yang ada + offset attempt
    const count = await GiveawayTicket.countDocuments({ giveawayId });
    const nextNum = count + 1 + attempt;
    const candidateNumber = `TK-${nextNum.toString().padStart(4, "0")}`;

    try {
      await GiveawayTicket.create({
        giveawayId,
        discordId: String(discordId),
        ticketNumber: candidateNumber,
        sourceType,
        questId: questId ? String(questId) : null,
        costNC,
      });
      return candidateNumber;
    } catch (err: any) {
      lastError = err;
      if (err.code === 11000) {
        const errMsg = err.message || "";
        const keyPattern = err.keyPattern || {};

        // Jika benturan pada questId (user sudah pernah klaim quest ini), langsung hentikan (jangan retry)
        if (keyPattern.questId || errMsg.includes("questId")) {
          throw new Error("Anda sudah pernah mengklaim tiket untuk quest ini.");
        }

        // Jika benturan pada ticketNumber (ada user lain yang baru saja dapat nomor yang sama), lanjutkan retry
        if (keyPattern.ticketNumber || errMsg.includes("ticketNumber")) {
          continue;
        }
      }
      throw err;
    }
  }

  // Fallback: Jika setelah 5x retry tetap benturan sangat tinggi, gunakan nomor acak unik terjamin
  const fallbackNumber = `TK-${Date.now().toString().slice(-4)}${crypto.randomInt(10, 99)}`;
  await GiveawayTicket.create({
    giveawayId,
    discordId: String(discordId),
    ticketNumber: fallbackNumber,
    sourceType,
    questId: questId ? String(questId) : null,
    costNC,
  });
  return fallbackNumber;
}

/**
 * Klaim tiket undian gratis dari penyelesaian Quest Pengantaran
 * Dilengkapi Rate Limit, Concurrency Retry, dan Proteksi Rollback.
 */
export async function claimGiveawayQuestTicket(
  giveawayId: string,
  questId: string,
  discordId: string
): Promise<{ success: boolean; error?: string; ticketNumber?: string }> {
  // 0. UX Guard: Rate Limiting
  if (!checkRateLimit(discordId, "giveaway-claim-quest", 1000)) {
    return { success: false, error: "Mohon tunggu 1 detik sebelum mengklaim tiket kembali." };
  }

  const giveaway = await Giveaway.findById(giveawayId);
  if (!giveaway) {
    return { success: false, error: "Giveaway tidak ditemukan." };
  }

  const now = new Date();
  if (giveaway.status !== "ongoing" || now < giveaway.startDate || now > giveaway.endDate) {
    return { success: false, error: "Event giveaway sedang tidak aktif menerima klaim tiket." };
  }

  if (!giveaway.enableQuests) {
    return { success: false, error: "Sistem quest dinonaktifkan pada giveaway ini." };
  }

  // 1. Cek apakah tiket quest ini sudah pernah diklaim
  const existingTicket = await GiveawayTicket.findOne({
    giveawayId,
    discordId: String(discordId),
    questId: String(questId),
  });

  if (existingTicket) {
    return { success: false, error: "Anda sudah pernah mengklaim tiket untuk quest ini." };
  }

  // 2. Evaluasi progres quest user (bypass cache untuk validasi instan)
  const progress = await getUserGiveawayProgress(giveawayId, discordId, true);
  const targetQuest = progress.quests.find((q) => q.questId === questId);

  if (!targetQuest) {
    return { success: false, error: "Konfigurasi quest tidak ditemukan." };
  }

  if (!targetQuest.isCompleted) {
    return {
      success: false,
      error: `Syarat quest belum terpenuhi (${targetQuest.currentValue}/${targetQuest.target}). Selesaikan pekerjaan di game terlebih dahulu.`,
    };
  }

  // 3. Terbitkan tiket undian secara aman dengan mekanisme Concurrency Collision Retry
  let ticketNumber: string;
  try {
    ticketNumber = await issueTicketWithRetry(
      giveawayId,
      String(discordId),
      "QUEST",
      0,
      String(questId)
    );
  } catch (err: any) {
    console.error("[Giveaway] Error issuing quest ticket:", err);
    return {
      success: false,
      error: err.message || "Gagal menerbitkan tiket misi. Silakan coba kembali.",
    };
  }

  // 4. Update statistik giveaway dengan proteksi rollback jika update counter gagal
  try {
    const totalUserTickets = await GiveawayTicket.countDocuments({ giveawayId, discordId: String(discordId) });
    const isFirstTicket = totalUserTickets === 1;

    await Giveaway.updateOne(
      { _id: giveawayId },
      {
        $inc: {
          "stats.totalTickets": 1,
          ...(isFirstTicket ? { "stats.totalParticipants": 1 } : {}),
        },
      }
    );
  } catch (statErr) {
    console.error("[Giveaway] Failed to update giveaway stats, rolling back ticket:", statErr);
    // Rollback tiket agar konsistensi counter & status tetap terjaga utuh
    try {
      await GiveawayTicket.deleteOne({
        giveawayId,
        discordId: String(discordId),
        ticketNumber,
      });
    } catch (_) {}
    return {
      success: false,
      error: "Terjadi gangguan sistem saat memperbarui data giveaway. Silakan coba kembali.",
    };
  }

  // Invalidate Redis cache
  if (redis) {
    try {
      await redis.del(`giveaway:user:${giveawayId}:${discordId}`);
    } catch (_) {}
  }

  return { success: true, ticketNumber };
}

/**
 * Membeli tiket undian ekstra menggunakan Nismara Coin (Burn NC)
 * Dilengkapi Pola Atomic Gate, Pembersihan Tiket Parsial, dan Rollback anti-race condition.
 */
export async function buyGiveawayTickets(
  giveawayId: string,
  discordId: string,
  quantity: number = 1
): Promise<{ success: boolean; error?: string; ticketNumbers?: string[]; totalCost?: number }> {
  // 0. UX Guard: Rate Limiting
  if (!checkRateLimit(discordId, "giveaway-buy-ticket", 1000)) {
    return { success: false, error: "Mohon tunggu 1 detik sebelum membeli tiket kembali." };
  }

  if (quantity <= 0 || !Number.isInteger(quantity)) {
    return { success: false, error: "Jumlah tiket harus berupa angka bulat minimal 1." };
  }

  const giveaway = await Giveaway.findById(giveawayId);
  if (!giveaway) {
    return { success: false, error: "Giveaway tidak ditemukan." };
  }

  const now = new Date();
  if (giveaway.status !== "ongoing" || now < giveaway.startDate || now > giveaway.endDate) {
    return { success: false, error: "Pembelian tiket ditutup karena periode giveaway tidak aktif." };
  }

  if (!giveaway.enableNcPurchase) {
    return { success: false, error: "Pembelian tiket ekstra dengan NC dinonaktifkan pada event ini." };
  }

  // 1. Cek kuota maksimal pembelian per user
  const userPurchasedCount = await GiveawayTicket.countDocuments({
    giveawayId,
    discordId: String(discordId),
    sourceType: "NC_PURCHASE",
  });

  const maxAllowed = giveaway.maxPurchasableTickets || 5;
  if (maxAllowed > 0 && userPurchasedCount + quantity > maxAllowed) {
    const sisaKuota = Math.max(0, maxAllowed - userPurchasedCount);
    return {
      success: false,
      error: `Batas maksimal pembelian adalah ${maxAllowed} tiket per pengemudi. Sisa kuota Anda: ${sisaKuota} tiket.`,
    };
  }

  // 2. Hitung harga tiket dengan diskon 20% untuk Nismara+ & Discord Server Booster
  const user = await User.findOne({ discordId: String(discordId) }).lean();
  const nplus = (user as any)?.nismaraplus || { status: false, expiredAt: null };
  const isNplusExpired = nplus.expiredAt ? new Date(nplus.expiredAt) < now : true;
  const isNplusActive = Boolean(nplus.status && !isNplusExpired);
  const isBooster = Boolean((user as any)?.isBooster);

  const discountPercent = (isNplusActive || isBooster) ? (giveaway.discountNPlusAndBooster || 20) : 0;
  const basePrice = giveaway.ticketPriceNC || 1000;
  const unitPrice = discountPercent > 0
    ? Math.round(basePrice * (1 - discountPercent / 100))
    : basePrice;
  const totalCost = unitPrice * quantity;

  const client = await clientPromise;
  const db = client.db();

  // 3. Pola Atomic Gate: Potong NC langsung di database dengan validasi saldo
  const updateCurrency = await db.collection("currencies").updateOne(
    {
      userId: String(discordId),
      guildId: GUILD_ID,
      totalNC: { $gte: totalCost },
    },
    {
      $inc: { totalNC: -totalCost },
    }
  );

  if (updateCurrency.modifiedCount === 0) {
    return { success: false, error: `Saldo Nismara Coin Anda tidak mencukupi (Dibutuhkan: ${totalCost.toLocaleString("id-ID")} NC).` };
  }

  // 4. Catat riwayat mutasi NC
  await db.collection("currencyhistories").insertOne({
    userId: String(discordId),
    guildId: GUILD_ID,
    amount: totalCost,
    type: "spend",
    reason: `Beli ${quantity}x Tiket Giveaway: ${giveaway.title}${discountPercent > 0 ? " (Diskon 20% N+/Booster)" : ""}`,
    createdAt: new Date(),
  });

  // 5. Terbitkan tiket undian secara berurutan dengan penanganan rollback aman & pembersihan parsial
  const issuedTickets: string[] = [];
  try {
    for (let i = 0; i < quantity; i++) {
      const ticketNumber = await issueTicketWithRetry(
        giveawayId,
        String(discordId),
        "NC_PURCHASE",
        unitPrice
      );
      issuedTickets.push(ticketNumber);
    }
  } catch (err: any) {
    console.error("[Giveaway] Error issuing tickets, rolling back currency deduction and issued tickets:", err);

    // Rollback tiket yang sempat terbit (Pembersihan Parsial Zero-Orphan)
    if (issuedTickets.length > 0) {
      try {
        await GiveawayTicket.deleteMany({
          giveawayId,
          discordId: String(discordId),
          ticketNumber: { $in: issuedTickets },
        });
      } catch (delErr) {
        console.error("[Giveaway Rollback] Error deleting partial tickets:", delErr);
      }
    }

    // Rollback NC ke saldo user
    await db.collection("currencies").updateOne(
      { userId: String(discordId), guildId: GUILD_ID },
      { $inc: { totalNC: totalCost } }
    );
    await db.collection("currencyhistories").insertOne({
      userId: String(discordId),
      guildId: GUILD_ID,
      amount: totalCost,
      type: "earn",
      reason: `Rollback Beli Tiket Giveaway Gagal (${giveaway.title})`,
      createdAt: new Date(),
    });

    return { success: false, error: "Terjadi gangguan saat menerbitkan tiket undian. Saldo NC telah dikembalikan." };
  }

  // 6. Catat riwayat transaksi belanja (transactions collection) untuk audit user
  try {
    await db.collection("transactions").insertOne({
      trxId: `TRX-GW-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
      discordId: String(discordId),
      userId: (user as any)?._id || null,
      title: `Beli ${quantity}x Tiket Giveaway: ${giveaway.title}`,
      category: "others",
      amount: totalCost,
      currency: "NC",
      status: "success",
      metadata: {
        giveawayId: String(giveaway._id),
        giveawayTitle: giveaway.title,
        quantity,
        ticketNumbers: issuedTickets,
        unitPrice,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (trxErr) {
    console.error("[Giveaway] Warning: Failed to insert user transaction log:", trxErr);
  }

  // 7. Update statistik giveaway
  const totalUserTickets = await GiveawayTicket.countDocuments({ giveawayId, discordId: String(discordId) });
  const isFirstTicket = totalUserTickets === quantity;

  await Giveaway.updateOne(
    { _id: giveawayId },
    {
      $inc: {
        "stats.totalTickets": quantity,
        "stats.totalNcBurned": totalCost,
        ...(isFirstTicket ? { "stats.totalParticipants": 1 } : {}),
      },
    }
  );

  // Invalidate Redis cache
  if (redis) {
    try {
      await redis.del(`giveaway:user:${giveawayId}:${discordId}`);
    } catch (_) {}
  }

  return { success: true, ticketNumbers: issuedTickets, totalCost };
}

/**
 * Eksekusi pengundian pemenang Giveaway secara atomik, acak adil (fair draw),
 * mematuhi aturan 1 User 1 Hadiah (jika toggle aktif), dan langsung menyalurkan hadiah.
 */
export async function executeGiveawayDraw(
  giveawayId: string
): Promise<{ success: boolean; error?: string; giveawayTitle?: string; winners?: GiveawayWinner[] }> {
  // 1. Pola State Locking: Kunci status menjadi 'drawing' agar tidak terjadi eksekusi ganda (race condition)
  const lockedGiveaway = await Giveaway.findOneAndUpdate(
    {
      _id: giveawayId,
      status: { $in: ["ongoing", "drawing", "scheduled"] },
    },
    {
      $set: { status: "drawing" },
    },
    { new: true }
  );

  if (!lockedGiveaway) {
    return { success: false, error: "Giveaway tidak ditemukan atau statusnya sudah completed/cancelled." };
  }

  // 2. Ambil seluruh tiket yang terdaftar pada giveaway ini
  const allTickets = await GiveawayTicket.find({ giveawayId }).lean();

  if (allTickets.length === 0) {
    await Giveaway.updateOne(
      { _id: giveawayId },
      { $set: { status: "completed", winners: [], drawDate: new Date() } }
    );
    return {
      success: true,
      giveawayTitle: lockedGiveaway.title,
      winners: [],
    };
  }

  const client = await clientPromise;
  const db = client.db();

  // 3. Siapkan pool tiket dan algoritma pengundian
  let ticketPool = [...allTickets];
  const wonDiscordIds = new Set<string>();
  const finalWinners: GiveawayWinner[] = [];

  // Urutkan tier dari Juara 1 ke bawah
  const sortedTiers = [...(lockedGiveaway.prizes || [])].sort((a, b) => a.tier - b.tier);

  for (const tier of sortedTiers) {
    const winnerCount = tier.winnerCount || 1;

    for (let slot = 0; slot < winnerCount; slot++) {
      // Filter tiket yang sah berdasarkan toggle 1 User 1 Hadiah
      let eligibleTickets = ticketPool;
      if (!lockedGiveaway.allowMultipleWins) {
        eligibleTickets = ticketPool.filter((t) => !wonDiscordIds.has(String(t.discordId)));
      }

      if (eligibleTickets.length === 0) {
        break; // Tidak ada lagi kandidat yang memenuhi syarat
      }

      // Ambil acak menggunakan crypto.randomInt yang aman dan teruji
      const randomIndex = crypto.randomInt(0, eligibleTickets.length);
      const chosenTicket = eligibleTickets[randomIndex];

      // Ambil identitas user dari database users
      const winnerUser = await db.collection("users").findOne({ discordId: String(chosenTicket.discordId) });
      const winnerName = winnerUser?.name || `Driver #${chosenTicket.discordId.slice(-4)}`;
      const winnerAvatar = winnerUser?.image || null;

      const winnerRecord: GiveawayWinner = {
        tier: tier.tier,
        tierTitle: tier.tierTitle,
        discordId: String(chosenTicket.discordId),
        name: winnerName,
        avatarUrl: winnerAvatar,
        ticketNumber: String(chosenTicket.ticketNumber),
        rewards: tier.rewards || [],
        drawnAt: new Date(),
      };

      finalWinners.push(winnerRecord);

      // Tandai discordId ini sudah menang
      wonDiscordIds.add(String(chosenTicket.discordId));

      // Hapus tiket yang sudah menang dari pool agar tidak menang dobel di slot lain
      ticketPool = ticketPool.filter((t) => String(t._id) !== String(chosenTicket._id));

      // 4. Penyaluran Hadiah Atomik ke Akun Pemenang
      for (const reward of (tier.rewards || [])) {
        try {
          if (reward.type === "NC" && reward.amount && reward.amount > 0) {
            await db.collection("currencies").updateOne(
              { userId: String(chosenTicket.discordId), guildId: GUILD_ID },
              { $inc: { totalNC: reward.amount } },
              { upsert: true }
            );
            await db.collection("currencyhistories").insertOne({
              userId: String(chosenTicket.discordId),
              guildId: GUILD_ID,
              amount: reward.amount,
              type: "earn",
              reason: `Hadiah ${tier.tierTitle} Giveaway: ${lockedGiveaway.title}`,
              createdAt: new Date(),
            });
          } else if (reward.type === "FUEL" && reward.amount && reward.amount > 0) {
            await db.collection("garages").updateOne(
              { discordId: String(chosenTicket.discordId) },
              {
                $inc: { fuelStock: reward.amount },
                $setOnInsert: {
                  userId: winnerUser?._id || null,
                  discordId: String(chosenTicket.discordId),
                  fleetSlot: 1,
                  fleetSlotUsed: 0,
                  fleetSlotLevel: 1,
                  status: "operational",
                  operational_cost: 0,
                  fleet_operational_cost: 0,
                  fuel_operational_cost: 0,
                  next_payment_date: null,
                  fuelCapacity: 2000,
                  fuelTankLevel: 1,
                  safeboxLevel: 1,
                  safeboxStock: 0,
                  safebox_operational_cost: 0,
                },
              },
              { upsert: true }
            );
          } else if (reward.type === "SAFEBOX_TICKET" && reward.amount && reward.amount > 0) {
            await db.collection("garages").updateOne(
              { discordId: String(chosenTicket.discordId) },
              {
                $inc: { safeboxStock: reward.amount },
                $setOnInsert: {
                  userId: winnerUser?._id || null,
                  discordId: String(chosenTicket.discordId),
                  fleetSlot: 1,
                  fleetSlotUsed: 0,
                  fleetSlotLevel: 1,
                  status: "operational",
                  operational_cost: 0,
                  fleet_operational_cost: 0,
                  fuel_operational_cost: 0,
                  next_payment_date: null,
                  fuelCapacity: 2000,
                  fuelStock: 0,
                  fuelTankLevel: 1,
                  safeboxLevel: 1,
                  safebox_operational_cost: 0,
                },
              },
              { upsert: true }
            );
          } else if (reward.type === "VOUCHER" && reward.voucherCategory) {
            const randomCode = `GW-${reward.voucherCategory.slice(0, 3)}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
            const discountVal = Number(reward.voucherDiscountValue) || (reward.voucherCategory === "FLEET_MAINTENANCE" ? 100 : 50);
            const durationHrs = reward.voucherCategory === "NC_BOOSTER" ? (Number(reward.voucherDurationHours) || 24) : 0;
            const expireDays = typeof reward.voucherExpireDays === "number" ? reward.voucherExpireDays : 30;
            const expiresAt = expireDays > 0 ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000) : null;

            // Tentukan judul voucher yang jelas dan akurat jika tidak diisi manual
            let voucherTitle = reward.title?.trim();
            if (!voucherTitle) {
              if (reward.voucherCategory === "NC_BOOSTER") {
                voucherTitle = `Booster NC +${discountVal}% (${durationHrs} Jam)`;
              } else if (reward.voucherCategory === "FLEET_MAINTENANCE") {
                voucherTitle = discountVal === 100 ? "Bebas Servis Armada (100%)" : `Diskon Servis Truk ${discountVal}%`;
              } else if (reward.voucherCategory === "MARKET_MOD") {
                voucherTitle = `Diskon Mod Market ${discountVal}%`;
              } else if (reward.voucherCategory === "FLEET_BUY") {
                voucherTitle = `Diskon Pembelian Fleet ${discountVal}%`;
              } else if (reward.voucherCategory === "GARAGE_UPGRADE") {
                voucherTitle = `Diskon Upgrade Garasi ${discountVal}%`;
              } else {
                voucherTitle = `Voucher ${tier.tierTitle}`;
              }
            }

            await db.collection("uservouchers").insertOne({
              userId: winnerUser?._id || null,
              discordId: String(chosenTicket.discordId),
              guildId: GUILD_ID,
              code: randomCode,
              title: voucherTitle,
              description: reward.description || `Hadiah ${tier.tierTitle} dari Giveaway ${lockedGiveaway.title}`,
              category: reward.voucherCategory,
              discountType: reward.voucherDiscountType || "percentage",
              discountValue: discountVal,
              durationHours: durationHrs,
              maxDiscount: 0,
              minSpend: 0,
              status: "ACTIVE",
              source: `GIVEAWAY_${lockedGiveaway.slug.toUpperCase()}`,
              expiresAt,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else if (reward.type === "NPLUS_TRIAL" && reward.amount && reward.amount > 0) {
            const trialDays = reward.amount;
            const currentExp = winnerUser?.nismaraplus?.expiredAt ? new Date(winnerUser.nismaraplus.expiredAt) : new Date();
            const baseDate = currentExp > new Date() ? currentExp : new Date();
            const newExpiry = new Date(baseDate.getTime() + trialDays * 24 * 60 * 60 * 1000);

            await db.collection("users").updateOne(
              { discordId: String(chosenTicket.discordId) },
              {
                $set: {
                  "nismaraplus.status": true,
                  "nismaraplus.expiredAt": newExpiry,
                },
              }
            );

            // Invalidate Redis session cache agar badge Nismara+ langsung aktif seketika
            try {
              if (winnerUser?._id) {
                await redis.del(`session:profile:${winnerUser._id}`);
              }
              await redis.del(`session:profile:${chosenTicket.discordId}`);
            } catch (_) {}
          }
        } catch (err: any) {
          console.error(`[Giveaway] Error granting reward ${reward.type} to ${chosenTicket.discordId}:`, err);
        }
      }
    }
  }

  // 5. Simpan pemenang dan selesaikan giveaway
  await Giveaway.updateOne(
    { _id: giveawayId },
    {
      $set: {
        status: "completed",
        winners: finalWinners,
        drawDate: new Date(),
      },
    }
  );

  return {
    success: true,
    giveawayTitle: lockedGiveaway.title,
    winners: finalWinners,
  };
}
