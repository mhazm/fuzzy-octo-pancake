"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import clientPromise from "@/lib/mongodb";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ObjectId } from "mongodb";

const GUILD_ID = "863959415702028318";

// Fungsi untuk mengecek status Booster via Discord API
async function checkDiscordBooster(userId: string) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) return false;

  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}`,
      {
        headers: { Authorization: `Bot ${botToken}` },
        next: { revalidate: 3600 }, // Cache 1 jam agar tidak spam API Discord
      },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data.premium_since !== null;
  } catch (err) {
    console.error("Gagal mengecek status booster:", err);
    return false;
  }
}

async function sendDiscordLog(embed: any) {
  const webhookUrl = process.env.DISCORD_LOG_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            ...embed,
            timestamp: new Date().toISOString(),
            footer: { text: "Nismara Transport Logging System" },
          },
        ],
      }),
    });
  } catch (err) {
    console.error("Gagal mengirim Discord Log:", err);
  }
}

export async function getUserPointsData(userId: string) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const [pointData, currencyData, historyData, guildSettings, isBooster, garageData] =
      await Promise.all([
        db.collection("points").findOne({ userId, guildId: GUILD_ID }),
        db.collection("currencies").findOne({ userId, guildId: GUILD_ID }),
        db
          .collection("pointhistories")
          .find({ userId, guildId: GUILD_ID })
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray(),
        db.collection("guildsettings").findOne({ guildId: GUILD_ID }),
        checkDiscordBooster(userId), // Cek status booster paralel
        db.collection("garages").findOne({ discordId: userId }),
      ]);

    const totalPenaltyTickets = garageData?.safeboxStock || 0;
    const maxPenaltyTickets = 10 + ((garageData?.safeboxLevel || 1) - 1) * 5;

    // Berikan diskon 500 NC jika user adalah booster
    const discountBooster = isBooster ? 500 : 0;

    return {
      totalPoints: pointData?.totalPoints || 0,
      totalNC: currencyData?.totalNC || 0,
      pointPrice: guildSettings?.pointPrice || 3000,
      discountBooster,
      totalPenaltyTickets,
      maxPenaltyTickets,
      history: historyData.map((item) => ({
        ...item,
        _id: item._id.toString(),
      })),
    };
  } catch (error) {
    console.error("Gagal mengambil data poin:", error);
    throw new Error("Gagal mengambil data dari database.");
  }
}

export async function payPenaltyPoints(pointsToPay: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) throw new Error("Unauthorized");

    // Pastikan userId selalu bertipe string
    const userId = String(session.user.discordId);
    const userName = session.user.name || userId;
    const client = await clientPromise;
    const db = client.db();

    const [pointData, currencyData, guildSettings, isBooster] =
      await Promise.all([
        db.collection("points").findOne({ userId, guildId: GUILD_ID }),
        db.collection("currencies").findOne({ userId, guildId: GUILD_ID }),
        db.collection("guildsettings").findOne({ guildId: GUILD_ID }),
        checkDiscordBooster(userId), // Error akan hilang karena userId sudah pasti string
      ]);

    const currentPoints = pointData?.totalPoints || 0;
    const currentNC = currencyData?.totalNC || 0;
    const pointPrice = guildSettings?.pointPrice || 3000;
    const discountBooster = isBooster ? 500 : 0;

    // Kalkulasi harga final dengan proteksi harga tidak boleh minus
    const finalPrice = Math.max(0, pointPrice - discountBooster);
    const totalCost = pointsToPay * finalPrice;

    if (pointsToPay <= 0) throw new Error("Jumlah poin tidak valid.");
    if (pointsToPay > currentPoints)
      throw new Error(
        "Anda tidak bisa membayar lebih dari poin penalti yang dimiliki.",
      );
    if (currentNC < totalCost)
      throw new Error("Nismara Coin (NC) Anda tidak mencukupi.");

    await Promise.all([
      db
        .collection("currencies")
        .updateOne(
          { userId, guildId: GUILD_ID },
          { $inc: { totalNC: -totalCost } },
        ),
      db
        .collection("points")
        .updateOne(
          { userId, guildId: GUILD_ID },
          [{ $set: { totalPoints: { $max: [0, { $subtract: [{ $ifNull: ["$totalPoints", 0] }, pointsToPay] }] } } }]
        ),
      db.collection("pointhistories").insertOne({
        userId,
        guildId: GUILD_ID,
        managerId: userId,
        points: pointsToPay,
        reason: `Membayar penalti menggunakan ${totalCost} NC ${isBooster ? "(Booster Discount)" : ""}`,
        type: "remove",
        createdAt: new Date(),
      }),
      db.collection("currencyhistories").insertOne({
        userId,
        guildId: GUILD_ID,
        managerId: userId,
        amount: `-${totalCost}`,
        type: "spend",
        reason: `Tebus ${pointsToPay} penalty point`,
        createdAt: new Date(),
      }),
    ]);

    await sendDiscordLog({
      title: "💰 Pembayaran Poin Penalti (NC)",
      color: 0xffaa00,
      fields: [
        { name: "Driver", value: `<@${userId}>`, inline: true },
        { name: "Poin Ditebus", value: `${pointsToPay} Poin`, inline: true },
        {
          name: "Biaya Total",
          value: `${totalCost.toLocaleString()} NC`,
          inline: true,
        },
      ],
    });

    revalidatePath("/dashboard/points");
    return { success: true, message: "Berhasil membayar poin penalti!" };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Terjadi kesalahan sistem.",
    };
  }
}

// Tambahkan fungsi helper untuk pengecekan legacy data
export async function getEligibleJobsForValidation(userId: string) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // 1. Ambil semua jobId yang sudah pernah divalidasi oleh user ini dari koleksi validatedjobs
    const [validatedRecords, user] = await Promise.all([
      db.collection("validatedjobs").find({ userId: userId, guildId: GUILD_ID }, { projection: { jobId: 1 } }).toArray(),
      db.collection("users").findOne({ discordId: userId })
    ]);

    const validatedIds = validatedRecords.map((rec) => rec.jobId);
    
    // Check Nismara Plus status
    const isNismaraPlus = user?.nismaraplus?.status === true;

    // 2. Cari job yang layak, tapi TIDAK ada di daftar validatedIds
    const jobs = await db
      .collection("jobhistories")
      .find({
        driverId: userId,
        jobStatus: "COMPLETED",
        hardcoreRating: { $gte: 4 }, // hardcore rating 4 keatas
        jobId: { $nin: validatedIds }, // Pastikan jobId tidak ada di koleksi validatedjobs
      })
      .sort({ completedAt: -1 })
      .toArray();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return jobs
      .map((job) => {
        const distance = job.distanceKm || 0;
        const jobDate = new Date(job.completedAt);
        const isOld = jobDate < thirtyDaysAgo;

        if (isOld) {
          const ticketAmount = Math.floor(distance / (isNismaraPlus ? 800 : 1000));
          return {
            _id: job._id.toString(),
            jobId: job.jobId,
            sourceCity: job.sourceCity,
            destinationCity: job.destinationCity,
            distance: distance,
            hardcorePoints: job.hardcoreRating,
            type: "exchange",
            ticketAmount: ticketAmount,
          };
        } else {
          const potentialReduction = Math.floor(distance / 500);
          return {
            _id: job._id.toString(),
            jobId: job.jobId,
            sourceCity: job.sourceCity,
            destinationCity: job.destinationCity,
            distance: distance,
            hardcorePoints: job.hardcoreRating,
            type: "validation",
            potentialReduction: potentialReduction,
          };
        }
      })
      .filter((job) => (job.type === "exchange" ? (job.ticketAmount && job.ticketAmount > 0) : (job.potentialReduction && job.potentialReduction > 0)));
  } catch (error) {
    console.error("Gagal mengambil job layak validasi:", error);
    return [];
  }
}

export async function validateJobPoints(jobId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) throw new Error("Unauthorized");

    const userId = session.user.discordId;
    const userName = session.user.name || userId;
    const client = await clientPromise;
    const db = client.db();

    // 1. Ambil data job asli
    const job = await db.collection("jobhistories").findOne({
      _id: new ObjectId(jobId),
      driverId: userId,
    });

    if (!job) throw new Error("Job tidak ditemukan.");

    // 2. Cek apakah jobId ini sudah ada di koleksi validatedjobs
    const alreadyValidated = await db
      .collection("validatedjobs")
      .findOne({ jobId: job.jobId });
    if (alreadyValidated) {
      throw new Error("Job ini sudah pernah divalidasi atau ditukar tiket.");
    }
    
    // Cek umur job
    const jobDate = new Date(job.completedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (jobDate < thirtyDaysAgo) {
      throw new Error("Job yang sudah lebih dari 30 hari tidak dapat divalidasi untuk pengurangan poin (silakan gunakan fitur Tukar Tiket).");
    }

    // 3. Ambil data poin penalti user saat ini
    const userPointsData = await db.collection("points").findOne({ userId, guildId: GUILD_ID });
    const currentPoints = userPointsData?.totalPoints || 0;

    if (currentPoints <= 0) {
      throw new Error("Anda tidak memiliki poin penalti untuk divalidasi.");
    }

    const distance = job.distanceKm || 0;
    const reduction = Math.floor(distance / 500);

    if (reduction <= 0)
      throw new Error("Jarak job tidak mencukupi untuk pengurangan poin.");

    // Mencegah poin menjadi minus
    const actualReduction = Math.min(reduction, currentPoints);

    // 4. Jalankan operasi atomik
    await Promise.all([
      // Insert ke koleksi validatedjobs (sebagai tracker utama)
      db.collection("validatedjobs").insertOne({
        guildId: GUILD_ID,
        userId: userId,
        jobId: job.jobId,
        distance: distance,
        deducted: actualReduction,
        type: "point_reduction",
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0,
      }),
      // Kurangi poin penalti
      db
        .collection("points")
        .updateOne(
          { userId, guildId: GUILD_ID },
          [{ $set: { totalPoints: { $max: [0, { $subtract: [{ $ifNull: ["$totalPoints", 0] }, actualReduction] }] } } }]
        ),
      // Catat sejarah poin
      db.collection("pointhistories").insertOne({
        userId,
        guildId: GUILD_ID,
        managerId: userId,
        points: actualReduction,
        reason: `Validasi Job Hardcore #${job.jobId} (-${actualReduction} Poin)`,
        type: "remove",
        createdAt: new Date(),
      }),
    ]);

    await sendDiscordLog({
      title: `✅ Validasi Job Hardcore ${job.jobId}`,
      color: 0x5865f2, // Warna Blurple
      fields: [
        { name: "Driver", value: `<@${userId}> (${userName})`, inline: true },
        { name: "Job ID", value: `#${job.jobId}`, inline: true },
        { name: "Rute", value: `${job.sourceCity} ➡️ ${job.destinationCity}` },
        { name: "Jarak", value: `${distance} km`, inline: true },
        { name: "Poin Berkurang", value: `-${actualReduction} Poin`, inline: true },
      ],
    });

    revalidatePath("/dashboard/points");
    return { success: true, message: `Berhasil! Poin berkurang ${reduction}.` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function usePenaltyTicket(amountToUse: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) throw new Error("Unauthorized");
    const userId = String(session.user.discordId);

    if (!amountToUse || amountToUse <= 0) {
      throw new Error("Jumlah tiket yang digunakan tidak valid.");
    }

    const client = await clientPromise;
    const db = client.db();

    // Cek poin user
    const pointData = await db.collection("points").findOne({ userId, guildId: GUILD_ID });
    if (!pointData || pointData.totalPoints <= 0) {
      throw new Error("Poin penalti Anda sudah bersih (0).");
    }

    if (amountToUse > pointData.totalPoints) {
      throw new Error("Anda tidak bisa menggunakan tiket lebih dari jumlah poin penalti Anda.");
    }

    // ==========================================
    // 🛡️ MENCEGAH RACE CONDITION MULTI-DOKUMEN
    // Kunci aksi (lock) pada user agar tidak bisa ditembak paralel
    // ==========================================
    const lockResult = await db.collection("users").updateOne(
      { discordId: userId, ticketLock: { $ne: true } },
      { $set: { ticketLock: true } }
    );

    if (lockResult.modifiedCount === 0) {
      throw new Error("Sistem sedang memproses transaksi Anda sebelumnya. Harap coba lagi dalam beberapa detik.");
    }

    try {
      // Cek Safebox
      const garageData = await db.collection("garages").findOne({ discordId: userId });
      const safeboxStock = garageData?.safeboxStock || 0;
      
      if (safeboxStock < amountToUse) {
        throw new Error("Anda tidak memiliki cukup tiket penghapusan penalti di Safebox.");
      }

      // Lakukan pemotongan paralel
      const operations: Promise<any>[] = [
        db.collection("points").updateOne({ userId, guildId: GUILD_ID }, [{ $set: { totalPoints: { $max: [0, { $subtract: [{ $ifNull: ["$totalPoints", 0] }, amountToUse] }] } } }]),
        db.collection("pointhistories").insertOne({
          userId,
          guildId: GUILD_ID,
          managerId: userId,
          points: amountToUse,
          reason: `Penggunaan ${amountToUse} Tiket Hapus Penalti dari Safebox`,
          type: "remove",
          createdAt: new Date(),
        }),
        db.collection("garages").updateOne(
          { discordId: userId },
          { $inc: { safeboxStock: -amountToUse } }
        )
      ];

      await Promise.all(operations);

    } finally {
      // 🔓 LEPAS LOCK APAPUN YANG TERJADI (BAIK BERHASIL MAUPUN ERROR)
      await db.collection("users").updateOne({ discordId: userId }, { $unset: { ticketLock: "" } });
    }

    await sendDiscordLog({
      title: "🎟️ Penggunaan Tiket Penalti",
      color: 0xef4444,
      fields: [
        { name: "Driver", value: `<@${userId}>`, inline: true },
        { name: "Poin Dihapus", value: `${amountToUse} Poin`, inline: true },
      ],
    });

    revalidatePath("/dashboard/points");
    return { success: true, message: `Berhasil menggunakan ${amountToUse} Tiket untuk menghapus ${amountToUse} Poin Penalti!` };
  } catch (error: any) {
    return { success: false, message: error.message || "Terjadi kesalahan sistem." };
  }
}

export async function exchangeJobForTickets(jobId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) throw new Error("Unauthorized");

    const userId = session.user.discordId;
    const userName = session.user.name || userId;
    const client = await clientPromise;
    const db = client.db();

    // 1. Ambil data job asli
    const job = await db.collection("jobhistories").findOne({
      _id: new ObjectId(jobId),
      driverId: userId,
    });

    if (!job) throw new Error("Job tidak ditemukan.");

    if (job.hardcoreRating < 4) {
      throw new Error("Hardcore rating kurang dari 4.");
    }

    // 2. Cek apakah jobId ini sudah ada di koleksi validatedjobs
    const alreadyValidated = await db
      .collection("validatedjobs")
      .findOne({ jobId: job.jobId });
    if (alreadyValidated) {
      throw new Error("Job ini sudah pernah divalidasi atau ditukar tiket.");
    }

    // Cek umur job (harus > 30 hari)
    const jobDate = new Date(job.completedAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (jobDate >= thirtyDaysAgo) {
      throw new Error("Job belum berumur 30 hari. Silakan gunakan fitur Validasi Poin.");
    }

    // 3. Cek Nismara Plus & Kapasitas Safebox
    const [user, garageData] = await Promise.all([
      db.collection("users").findOne({ discordId: userId }),
      db.collection("garages").findOne({ discordId: userId })
    ]);
    const isNismaraPlus = user?.nismaraplus?.status === true;

    const distance = job.distanceKm || 0;
    const ticketAmount = Math.floor(distance / (isNismaraPlus ? 800 : 1000));

    if (ticketAmount <= 0)
      throw new Error("Jarak job tidak mencukupi untuk ditukar menjadi tiket.");

    // Hitung kapasitas Safebox
    const safeboxStock = garageData?.safeboxStock || 0;
    const safeboxLevel = garageData?.safeboxLevel || 1;
    const maxCapacity = 10 + (safeboxLevel - 1) * 5;

    if (safeboxStock + ticketAmount > maxCapacity) {
      throw new Error(`Kapasitas Safebox Anda tidak mencukupi (Max: ${maxCapacity}). Harap upgrade Safebox di menu Garage terlebih dahulu.`);
    }

    // 4. Jalankan operasi atomik
    await Promise.all([
      db.collection("garages").updateOne(
        { discordId: userId },
        { $inc: { safeboxStock: ticketAmount } },
        { upsert: true }
      ),
      db.collection("validatedjobs").insertOne({
        guildId: GUILD_ID,
        userId: userId,
        jobId: job.jobId,
        distance: distance,
        ticketAmount: ticketAmount,
        type: "ticket_exchange",
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0,
      }),
    ]);

    await sendDiscordLog({
      title: `🎟️ Tukar Job ke Tiket Penalti`,
      color: 0xef4444, // Warna merah
      fields: [
        { name: "Driver", value: `<@${userId}> (${userName})`, inline: true },
        { name: "Job ID", value: `#${job.jobId}`, inline: true },
        { name: "Jarak", value: `${distance} km`, inline: true },
        { name: "Tiket Didapat", value: `+${ticketAmount} Tiket`, inline: true },
        { name: "Nismara Plus", value: isNismaraPlus ? "Aktif (Rate 800 KM)" : "Tidak Aktif (Rate 1000 KM)", inline: true },
      ],
    });

    revalidatePath("/dashboard/points");
    return { success: true, message: `Berhasil menukar job menjadi ${ticketAmount} Tiket Hapus Penalti!` };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

