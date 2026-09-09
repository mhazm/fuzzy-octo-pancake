import clientPromise from "@/lib/mongodb";
import { redis } from "@/lib/redis";
import {
  LeaderboardCategory,
  LeaderboardDriver,
  MyRankData,
  LeaderboardResult,
  formatLeaderboardMonthLabel,
} from "@/types/leaderboard";

export type {
  LeaderboardCategory,
  LeaderboardDriver,
  MyRankData,
  LeaderboardResult,
};
export { formatLeaderboardMonthLabel };

/**
 * Mengambil daftar bulan unik yang memiliki pekerjaan selesai (Job COMPLETED)
 */
export async function getAvailableLeaderboardMonths(): Promise<string[]> {
  const guildId = process.env.DISCORD_GUILD_ID || "863959415702028318";
  const cacheKey = `leaderboard:available-months:${guildId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.error("❌ [REDIS] Error reading available-months cache:", err);
  }

  const client = await clientPromise;
  const db = client.db();

  const pipeline = [
    { $match: { jobStatus: "COMPLETED", guildId } },
    {
      $project: {
        month: {
          $dateToString: {
            format: "%Y-%m",
            date: { $ifNull: ["$completedAt", "$createdAt"] },
            timezone: "Asia/Jakarta",
          },
        },
      },
    },
    { $group: { _id: "$month" } },
    { $sort: { _id: -1 } },
  ];

  const results = await db.collection("jobhistories").aggregate(pipeline).toArray();
  const months = results
    .map((r) => r._id as string)
    .filter((m) => m && typeof m === "string" && m.match(/^\d{4}-\d{2}$/));

  try {
    await redis.setex(cacheKey, 3600, JSON.stringify(months));
  } catch (err) {
    console.error("❌ [REDIS] Error caching available-months:", err);
  }

  return months;
}

/**
 * Mengambil data agregasi leaderboard berdasarkan kategori dan periode
 */
export async function getLeaderboardData(
  rawCategory?: string,
  rawPeriod?: string,
  currentDiscordId?: string
): Promise<LeaderboardResult> {
  const guildId = process.env.DISCORD_GUILD_ID || "863959415702028318";
  const validCategories: LeaderboardCategory[] = ["distance", "jobs", "mass", "nc"];
  const category: LeaderboardCategory = validCategories.includes(
    rawCategory as LeaderboardCategory
  )
    ? (rawCategory as LeaderboardCategory)
    : "distance";

  let period = rawPeriod || "";
  if (!period) {
    const availableMonths = await getAvailableLeaderboardMonths();
    period = availableMonths[0] || "all";
  }

  const cacheKey = `leaderboard:v4:data:${guildId}:${period}:${category}`;
  let rankedDrivers: any[] = [];

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      rankedDrivers = JSON.parse(cached);
    }
  } catch (err) {
    console.error("❌ [REDIS] Error reading leaderboard data cache:", err);
  }

  if (!rankedDrivers || rankedDrivers.length === 0) {
    const client = await clientPromise;
    const db = client.db();

    // 1. Ambil seluruh userId driver yang resmi terdaftar di driverlinks untuk guild ini
    const validDriverLinks = await db
      .collection("driverlinks")
      .find({ guildId })
      .toArray();
    const validDiscordIds = validDriverLinks.map((l: any) => l.userId);

    let startWib: Date | null = null;
    let endWib: Date | null = null;

    if (period !== "all") {
      const parts = period.split("-");
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        startWib = new Date(
          `${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`
        );
        const nextYear = month === 12 ? year + 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        endWib = new Date(
          `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+07:00`
        );
      }
    }

    if (category === "nc") {
      // Agregasi dari currencyhistories (tipe: 'earn', guildId spesifik, hanya driver resmi)
      const matchFilter: Record<string, any> = {
        type: "earn",
        guildId,
        userId: { $in: validDiscordIds },
      };
      if (startWib && endWib) {
        matchFilter.createdAt = { $gte: startWib, $lt: endWib };
      }

      const pipeline = [
        { $match: matchFilter },
        {
          $group: {
            _id: "$userId",
            total: { $sum: "$amount" },
          },
        },
        { $match: { total: { $gt: 0 } } },
        { $sort: { total: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "discordId",
            as: "user",
          },
        },
        {
          $lookup: {
            from: "driverlinks",
            let: { dId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$dId"] },
                      { $eq: ["$guildId", guildId] },
                    ],
                  },
                },
              },
            ],
            as: "driverlink",
          },
        },
        {
          $project: {
            discordId: "$_id",
            score: "$total",
            user: { $arrayElemAt: ["$user", 0] },
            driverlink: { $arrayElemAt: ["$driverlink", 0] },
          },
        },
        {
          $project: {
            discordId: 1,
            score: 1,
            name: {
              $ifNull: [
                "$user.name",
                { $ifNull: ["$driverlink.truckyName", "Driver #$discordId"] },
              ],
            },
            image: { $ifNull: ["$user.image", null] },
            truckyId: { $ifNull: ["$user.truckyId", "$driverlink.truckyId"] },
            role: "$user.role",
            truckyRank: "$user.truckyRank",
            isNismaraPlus: { $ifNull: ["$user.nismaraplus.status", false] },
            topManager: "$user.topManager",
            isBooster: "$user.isBooster",
          },
        },
      ];

      rankedDrivers = await db.collection("currencyhistories").aggregate(pipeline).toArray();
    } else {
      // Agregasi dari jobhistories (jobStatus: 'COMPLETED', guildId spesifik, hanya driver resmi)
      const matchFilter: Record<string, any> = {
        jobStatus: "COMPLETED",
        guildId,
        driverId: { $in: validDiscordIds },
      };
      if (startWib && endWib) {
        matchFilter.$or = [
          { completedAt: { $gte: startWib, $lt: endWib } },
          {
            completedAt: { $exists: false },
            createdAt: { $gte: startWib, $lt: endWib },
          },
          {
            completedAt: null,
            createdAt: { $gte: startWib, $lt: endWib },
          },
        ];
      }

      const sumField =
        category === "distance"
          ? "$distanceKm"
          : category === "mass"
          ? "$cargoMass"
          : 1;

      const pipeline = [
        { $match: matchFilter },
        {
          $group: {
            _id: "$driverId",
            total: { $sum: sumField },
          },
        },
        { $match: { total: { $gt: 0 } } },
        { $sort: { total: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "discordId",
            as: "user",
          },
        },
        {
          $lookup: {
            from: "driverlinks",
            let: { dId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$userId", "$$dId"] },
                      { $eq: ["$guildId", guildId] },
                    ],
                  },
                },
              },
            ],
            as: "driverlink",
          },
        },
        {
          $project: {
            discordId: "$_id",
            score: "$total",
            user: { $arrayElemAt: ["$user", 0] },
            driverlink: { $arrayElemAt: ["$driverlink", 0] },
          },
        },
        {
          $project: {
            discordId: 1,
            score: 1,
            name: {
              $ifNull: [
                "$user.name",
                { $ifNull: ["$driverlink.truckyName", "Driver #$discordId"] },
              ],
            },
            image: { $ifNull: ["$user.image", null] },
            truckyId: { $ifNull: ["$user.truckyId", "$driverlink.truckyId"] },
            role: "$user.role",
            truckyRank: "$user.truckyRank",
            isNismaraPlus: { $ifNull: ["$user.nismaraplus.status", false] },
            topManager: "$user.topManager",
            isBooster: "$user.isBooster",
          },
        },
      ];

      rankedDrivers = await db.collection("jobhistories").aggregate(pipeline).toArray();
    }

    try {
      await redis.setex(cacheKey, 600, JSON.stringify(rankedDrivers));
    } catch (err) {
      console.error("❌ [REDIS] Error saving leaderboard data cache:", err);
    }
  }

  const totalActiveDrivers = rankedDrivers.length;

  // Bangun daftar Top 10 dengan status rank
  const top10: LeaderboardDriver[] = rankedDrivers.slice(0, 10).map((d, index) => ({
    rank: index + 1,
    discordId: String(d.discordId || d._id),
    name: d.name || "Driver",
    image: d.image || null,
    truckyId: d.truckyId || null,
    role: d.role || null,
    truckyRank: d.truckyRank || null,
    isNismaraPlus: Boolean(d.isNismaraPlus),
    score: Number(d.score || 0),
    isBooster: Boolean(d.isBooster),
    topManager: d.topManager || null,
    isCurrentUser: Boolean(currentDiscordId && String(d.discordId || d._id) === String(currentDiscordId)),
  }));

  // Hitung My Rank jika ada user yang login
  let myRank: MyRankData | null = null;
  if (currentDiscordId) {
    const userIndex = rankedDrivers.findIndex(
      (d) => String(d.discordId || d._id) === String(currentDiscordId)
    );

    if (userIndex !== -1) {
      const userRank = userIndex + 1;
      const userScore = Number(rankedDrivers[userIndex].score || 0);
      const isTop10 = userRank <= 10;
      let diffToTop10: number | null = null;

      if (!isTop10 && top10.length >= 10) {
        const tenthPlaceScore = top10[9].score;
        diffToTop10 = Math.max(0, tenthPlaceScore - userScore);
      }

      myRank = {
        rank: userRank,
        score: userScore,
        totalActiveDrivers,
        diffToTop10,
        isTop10,
      };
    } else {
      myRank = {
        rank: null,
        score: 0,
        totalActiveDrivers,
        diffToTop10: top10.length >= 10 ? top10[9].score : null,
        isTop10: false,
      };
    }
  }

  return {
    category,
    period,
    periodLabel: formatLeaderboardMonthLabel(period),
    top10,
    myRank,
    totalActiveDrivers,
    updatedAt: new Date().toISOString(),
  };
}
