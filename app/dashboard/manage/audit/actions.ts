"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { revalidatePath } from "next/cache";

const GUILD_ID = process.env.DISCORD_GUILD_ID || "863959415702028318";
const DRIVER_ROLE_ID = process.env.DISCORD_DRIVER_ROLE_ID || "1405532668472590437";
const INTERN_ROLE_ID = process.env.DISCORD_INTERN_ROLE_ID || "1405533443651272804";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

async function assertManager() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "manager" && session.user.role !== "admin")) {
    throw new Error("Unauthorized: Hanya Staff/Manager yang dapat mengakses tindakan ini.");
  }
  return session.user;
}

/**
 * Update isDriver status for a single user in web database
 */
export async function setUserDriverStatus(discordId: string, isDriver: boolean) {
  try {
    await assertManager();

    const client = await clientPromise;
    const db = client.db();

    const result = await db.collection("users").updateOne(
      { discordId: String(discordId) },
      {
        $set: {
          isDriver: Boolean(isDriver),
          updatedAt: new Date(),
        },
      }
    );

    // Invalidate Redis profile cache if available
    try {
      const { redis } = await import("@/lib/redis");
      if (redis) {
        const user = await db.collection("users").findOne({ discordId: String(discordId) });
        if (user?._id) {
          await redis.del(`session:profile:${user._id.toString()}`);
        }
      }
    } catch {
      // Redis optional
    }

    revalidatePath("/dashboard/manage/audit");
    revalidatePath("/dashboard/manage");
    revalidatePath("/dashboard/manage/data/users");

    return {
      success: true,
      message: `Berhasil mengubah status isDriver menjadi ${isDriver} (${result.modifiedCount} user terupdate).`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal mengubah status driver.",
    };
  }
}

/**
 * Bulk fix: update isDriver to false for all users that do not exist in driverlinks
 */
export async function bulkFixInactiveUsers() {
  try {
    await assertManager();

    const client = await clientPromise;
    const db = client.db();

    const validDriverLinks = await db
      .collection("driverlinks")
      .find({ guildId: GUILD_ID })
      .toArray();
    const validUserIds = validDriverLinks.map((dl) => String(dl.userId));

    const result = await db.collection("users").updateMany(
      {
        isDriver: true,
        discordId: { $nin: validUserIds },
      },
      {
        $set: {
          isDriver: false,
          updatedAt: new Date(),
        },
      }
    );

    revalidatePath("/dashboard/manage/audit");
    revalidatePath("/dashboard/manage");
    revalidatePath("/dashboard/manage/data/users");

    return {
      success: true,
      message: `Berhasil menonaktifkan status driver untuk ${result.modifiedCount} pengguna.`,
      count: result.modifiedCount,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal memproses batch update driver.",
    };
  }
}

/**
 * Remove driver and/or intern role in Discord via Bot API
 */
export async function removeDiscordRoleAction(
  discordId: string,
  roleType: "driver" | "intern" | "both"
) {
  try {
    await assertManager();

    if (!BOT_TOKEN) {
      throw new Error("DISCORD_BOT_TOKEN tidak dikonfigurasi.");
    }

    const rolesToRemove: string[] = [];
    if (roleType === "driver" || roleType === "both") rolesToRemove.push(DRIVER_ROLE_ID);
    if (roleType === "intern" || roleType === "both") rolesToRemove.push(INTERN_ROLE_ID);

    for (const roleId of rolesToRemove) {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${discordId}/roles/${roleId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bot ${BOT_TOKEN}`,
            "X-Audit-Log-Reason": "Audit Member Hub: Role dicabut karena bukan DriverLink",
          },
        }
      );

      if (!res.ok && res.status !== 404) {
        throw new Error(`Discord API error: ${res.status} ${res.statusText}`);
      }
    }

    revalidatePath("/dashboard/manage/audit");
    return {
      success: true,
      message: `Role ${roleType.toUpperCase()} berhasil dicabut dari Discord.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal mencabut role di Discord.",
    };
  }
}

/**
 * Delete all orphaned data (pointhistories, currencyhistories, points balance, currencies balance)
 * for a specific ex-driver discordId
 */
export async function deleteOrphanedUserData(discordId: string) {
  try {
    await assertManager();

    const client = await clientPromise;
    const db = client.db();

    // Verify user is NOT in driverlinks to prevent accidental deletion of active drivers
    const isDriverLink = await db.collection("driverlinks").findOne({
      userId: String(discordId),
      guildId: GUILD_ID,
    });

    if (isDriverLink) {
      throw new Error("Pencegahan Keamanan: User ini adalah Driver Resmi aktif di driverlinks!");
    }

    const [phRes, chRes, currRes, ptsRes] = await Promise.all([
      db.collection("pointhistories").deleteMany({ userId: String(discordId), guildId: GUILD_ID }),
      db.collection("currencyhistories").deleteMany({ userId: String(discordId), guildId: GUILD_ID }),
      db.collection("currencies").deleteMany({ userId: String(discordId), guildId: GUILD_ID }),
      db.collection("points").deleteMany({ userId: String(discordId), guildId: GUILD_ID }),
    ]);

    revalidatePath("/dashboard/manage/audit");
    revalidatePath("/dashboard/manage");
    revalidatePath("/dashboard/manage/point-data");
    revalidatePath("/dashboard/manage/currency-data");

    return {
      success: true,
      message: `Berhasil menghapus: ${chRes.deletedCount} riwayat NC, ${phRes.deletedCount} riwayat Poin, ${currRes.deletedCount} saldo NC, dan ${ptsRes.deletedCount} saldo Poin.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Gagal menghapus data orphaned.",
    };
  }
}

/**
 * Bulk delete all orphaned data across currencies, points, pointhistories, and currencyhistories
 * where userId is not in driverlinks
 */
export async function bulkCleanOrphanedData() {
  try {
    await assertManager();

    const client = await clientPromise;
    const db = client.db();

    // 1. Get all valid driverlink userIds for this guild
    const validDriverLinks = await db
      .collection("driverlinks")
      .find({ guildId: GUILD_ID })
      .toArray();
    const validUserIds = validDriverLinks.map((dl) => String(dl.userId));

    // 2. Perform bulk deletion of records whose userId is not in validUserIds
    const [phRes, chRes, currRes, ptsRes] = await Promise.all([
      db.collection("pointhistories").deleteMany({
        guildId: GUILD_ID,
        userId: { $nin: validUserIds },
      }),
      db.collection("currencyhistories").deleteMany({
        guildId: GUILD_ID,
        userId: { $nin: validUserIds },
      }),
      db.collection("currencies").deleteMany({
        guildId: GUILD_ID,
        userId: { $nin: validUserIds },
      }),
      db.collection("points").deleteMany({
        guildId: GUILD_ID,
        userId: { $nin: validUserIds },
      }),
    ]);

    revalidatePath("/dashboard/manage/audit");
    revalidatePath("/dashboard/manage");
    revalidatePath("/dashboard/manage/point-data");
    revalidatePath("/dashboard/manage/currency-data");

    return {
      success: true,
      message: `Pembersihan Massal Berhasil! Dihapus: ${chRes.deletedCount} riwayat NC, ${phRes.deletedCount} riwayat Poin, ${currRes.deletedCount} akun saldo NC yatim, dan ${ptsRes.deletedCount} akun saldo Poin yatim.`,
      stats: {
        currencyHistories: chRes.deletedCount,
        pointHistories: phRes.deletedCount,
        currencies: currRes.deletedCount,
        points: ptsRes.deletedCount,
      },
    };
  } catch (error: any) {
      return {
        success: false,
        message: error.message || "Gagal memproses pembersihan massal data orphaned.",
      };
    }
  }

  /**
   * Inisialisasi saldo default (0 NC dan 0 PTS) untuk seluruh driverlinks resmi yang belum punya akun saldo
   */
  export async function syncDriverBalances() {
    try {
      await assertManager();

      const client = await clientPromise;
      const db = client.db();

      const driverLinks = await db.collection("driverlinks").find({ guildId: GUILD_ID }).toArray();
      let curCount = 0;
      let ptsCount = 0;

      for (const driver of driverLinks) {
        const curRes = await db.collection("currencies").updateOne(
          { guildId: GUILD_ID, userId: driver.userId },
          {
            $setOnInsert: {
              guildId: GUILD_ID,
              userId: driver.userId,
              totalNC: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
        if (curRes.upsertedCount > 0) curCount++;

        const ptsRes = await db.collection("points").updateOne(
          { guildId: GUILD_ID, userId: driver.userId },
          {
            $setOnInsert: {
              guildId: GUILD_ID,
              userId: driver.userId,
              totalPoints: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );
        if (ptsRes.upsertedCount > 0) ptsCount++;
      }

      revalidatePath("/dashboard/manage/audit");
      revalidatePath("/dashboard/manage");
      revalidatePath("/dashboard/manage/data/nc-data");
      revalidatePath("/dashboard/manage/data/point-data");

      return {
        success: true,
        message: `Sinkronisasi selesai! ${curCount} akun NC dan ${ptsCount} akun Poin berhasil diinisialisasi.`,
        curCount,
        ptsCount,
      };
    } catch (error: any) {
      console.error("syncDriverBalances error:", error);
      return { success: false, message: error.message || "Gagal melakukan sinkronisasi saldo." };
    }
  }

  function formatMonthLabel(monthKey: string): string {
    const parts = monthKey.split("-");
    if (parts.length !== 2) return monthKey;
    const monthNum = parseInt(parts[1], 10);
    const monthNames = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const name = monthNames[monthNum - 1] || parts[1];
    return `${name} ${parts[0]}`;
  }

  /**
   * Berikan Penalti 5 PTS untuk 1 Driver yang melanggar target minimum 2.500 KM bulanan
   * Dilengkapi Atomic Lock, Idempotency Gate, dan Pengecualian Driver Cuti
   */
  export async function penalizeDriverMinKm(userId: string, monthKey: string) {
    let acquiredLock = false;
    const lockKey = `lock:penalty:km:${userId}:${monthKey}`;

    try {
      const manager = await assertManager();

      // 1. Distributed Lock via Redis (NX, EX 15s) untuk mencegah double-click / concurrent race condition
      try {
        const { redis } = await import("@/lib/redis");
        if (redis) {
          const lockResult = await redis.set(lockKey, "locked", "EX", 15, "NX");
          if (!lockResult) {
            return {
              success: false,
              message: "Permintaan sedang diproses pada request lain. Mohon tunggu sesaat.",
            };
          }
          acquiredLock = true;
        }
      } catch {
        // Fallback jika Redis tidak tersedia
      }

      const client = await clientPromise;
      const db = client.db();

      const parts = monthKey.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const startWib = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`);
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;
      const endWib = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`);
      const monthLabel = formatMonthLabel(monthKey);

      // 2. Server-Side Guard: Driver Berstatus Cuti DILARANG & DIBEBASKAN dari Penalti
      const userDoc = await db.collection("users").findOne({ discordId: String(userId) });
      let isExemptedOnLeave = Boolean(userDoc?.isOnLeave);

      if (!isExemptedOnLeave) {
        const leaveOverlap = await db.collection("leavehistories").findOne({
          userId: String(userId),
          startDate: { $lt: endWib },
          endDate: { $gte: startWib },
        });
        if (leaveOverlap) isExemptedOnLeave = true;
      }

      if (isExemptedOnLeave) {
        return {
          success: false,
          message: `Driver berstatus cuti resmi pada bulan ${monthLabel} dan dibebaskan dari penalti minimum KM.`,
        };
      }

      // 3. Idempotency Gate di Database: Cek apakah sudah pernah diberi penalti untuk bulan ini
      const existingPenalty = await db.collection("pointhistories").findOne({
        userId: String(userId),
        guildId: GUILD_ID,
        $or: [
          { monthKey: monthKey, penaltyCode: "MIN_KM_VIOLATION" },
          { reason: { $regex: monthKey, $options: "i" }, type: "add" },
          { reason: { $regex: monthLabel, $options: "i" }, type: "add" },
        ],
      });

      if (existingPenalty) {
        return {
          success: false,
          message: `Driver sudah pernah diberi penalti untuk periode ${monthLabel}.`,
        };
      }

      // 4. Catat Log ke pointhistories
      const reason = `Tidak memenuhi target minimum 2.500 KM bulan ${monthLabel}`;
      await db.collection("pointhistories").insertOne({
        guildId: GUILD_ID,
        userId: String(userId),
        managerId: String(manager.discordId || manager.id || "Manager"),
        points: 5,
        type: "add",
        reason: reason,
        monthKey: monthKey,
        penaltyCode: "MIN_KM_VIOLATION",
        createdAt: new Date(),
      });

      // 5. Atomic Update Saldo Poin Penalti
      await db.collection("points").updateOne(
        { guildId: GUILD_ID, userId: String(userId) },
        {
          $inc: { totalPoints: 5 },
          $setOnInsert: {
            guildId: GUILD_ID,
            userId: String(userId),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Invalidate paths
      revalidatePath("/dashboard/manage/audit");
      revalidatePath("/dashboard/manage");
      revalidatePath("/dashboard/manage/data/point-data");

      return {
        success: true,
        message: `Berhasil menjatuhkan penalti +5 PTS kepada driver untuk periode ${monthLabel}.`,
      };
    } catch (error: any) {
      console.error("penalizeDriverMinKm error:", error);
      return { success: false, message: error.message || "Gagal memproses penalti driver." };
    } finally {
      if (acquiredLock) {
        try {
          const { redis } = await import("@/lib/redis");
          if (redis) await redis.del(lockKey);
        } catch {}
      }
    }
  }

  /**
   * Eksekusi Massal (Batch): Berikan Penalti 5 PTS kepada SELURUH Driver yang melanggar target 2.500 KM
   * Secara otomatis melewati driver cuti dan driver yang sudah pernah dihukum
   */
  export async function batchPenalizeMinKm(userIds: string[], monthKey: string) {
    try {
      const manager = await assertManager();

      if (!userIds || userIds.length === 0) {
        return { success: false, message: "Tidak ada driver yang dipilih untuk penalti." };
      }

      const client = await clientPromise;
      const db = client.db();

      const parts = monthKey.split("-");
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const startWib = new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`);
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;
      const endWib = new Date(`${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`);
      const monthLabel = formatMonthLabel(monthKey);
      const reason = `Tidak memenuhi target minimum 2.500 KM bulan ${monthLabel}`;

      // 1. Ambil seluruh user yang berstatus cuti pada bulan ini
      const usersOnLeave = await db.collection("users").find({
        discordId: { $in: userIds },
        isOnLeave: true,
      }).toArray();
      const onLeaveSet = new Set(usersOnLeave.map((u) => String(u.discordId)));

      const leaveHistories = await db.collection("leavehistories").find({
        userId: { $in: userIds },
        startDate: { $lt: endWib },
        endDate: { $gte: startWib },
      }).toArray();
      for (const lh of leaveHistories) {
        onLeaveSet.add(String(lh.userId));
      }

      // 2. Ambil seluruh user yang sudah pernah dihukum untuk bulan ini
      const existingPenalties = await db.collection("pointhistories").find({
        guildId: GUILD_ID,
        userId: { $in: userIds },
        $or: [
          { monthKey: monthKey, penaltyCode: "MIN_KM_VIOLATION" },
          { reason: { $regex: monthKey, $options: "i" }, type: "add" },
          { reason: { $regex: monthLabel, $options: "i" }, type: "add" },
        ],
      }).toArray();
      const alreadyPenalizedSet = new Set(existingPenalties.map((ep) => String(ep.userId)));

      // 3. Filter target final yang berhak dihukum
      const targetsToPenalize = userIds.filter(
        (id) => !onLeaveSet.has(String(id)) && !alreadyPenalizedSet.has(String(id))
      );

      if (targetsToPenalize.length === 0) {
        return {
          success: true,
          message: `Tidak ada driver baru yang perlu dihukum. Seluruh driver melanggar sudah pernah dihukum atau berstatus cuti resmi.`,
          penalizedCount: 0,
          skippedCount: userIds.length,
        };
      }

      let successCount = 0;
      const managerId = String(manager.discordId || manager.id || "Manager");
      const now = new Date();

      // 4. Eksekusi berurutan / atomic per user
      for (const uid of targetsToPenalize) {
        await db.collection("pointhistories").insertOne({
          guildId: GUILD_ID,
          userId: String(uid),
          managerId: managerId,
          points: 5,
          type: "add",
          reason: reason,
          monthKey: monthKey,
          penaltyCode: "MIN_KM_VIOLATION",
          createdAt: now,
        });

        await db.collection("points").updateOne(
          { guildId: GUILD_ID, userId: String(uid) },
          {
            $inc: { totalPoints: 5 },
            $setOnInsert: {
              guildId: GUILD_ID,
              userId: String(uid),
              createdAt: now,
              updatedAt: now,
            },
          },
          { upsert: true }
        );

        successCount++;
      }

      revalidatePath("/dashboard/manage/audit");
      revalidatePath("/dashboard/manage");
      revalidatePath("/dashboard/manage/data/point-data");

      return {
        success: true,
        message: `Batch Penalti Berhasil! ${successCount} driver berhasil dijatuhi penalti +5 PTS untuk periode ${monthLabel}. (${userIds.length - targetsToPenalize.length} dilewati karena cuti/sudah dihukum).`,
        penalizedCount: successCount,
        skippedCount: userIds.length - targetsToPenalize.length,
      };
    } catch (error: any) {
      console.error("batchPenalizeMinKm error:", error);
      return { success: false, message: error.message || "Gagal memproses penalti massal." };
    }
  }
