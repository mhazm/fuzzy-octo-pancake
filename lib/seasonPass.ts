import mongoose from "mongoose";
import SeasonPass, { SeasonLevelConfig, RewardItem } from "@/lib/models/SeasonPass";
import UserSeasonProgress from "@/lib/models/UserSeasonProgress";
import User from "@/lib/models/User";
import Garage from "@/lib/models/Garage";
import dbConnect from "@/lib/mongoose";
import { grantVoucher } from "@/lib/voucher";
import Achievement from "@/lib/models/Achievement";
import UserAchievement from "@/lib/models/UserAchievement";
import UserVoucher from "@/lib/models/UserVoucher";
import SystemSetting from "@/lib/models/SystemSetting";

export const SEASON_1_LEVELS: SeasonLevelConfig[] = [
  // TIER 1: STARTER ZONE (Level 1 - 10)
  {
    level: 1,
    xpRequired: 2000,
    cumulativeXp: 2000,
    freeRewards: [{ type: "NC", title: "1.000 Nismara Coin", amount: 1000 }],
    premiumRewards: [
      { type: "NC", title: "2.500 Nismara Coin", amount: 2500 },
      {
        type: "VOUCHER",
        title: "Voucher Booster +25% NC (2 Jam)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 25,
        voucherDurationHours: 2,
      },
    ],
  },
  {
    level: 2,
    xpRequired: 2500,
    cumulativeXp: 4500,
    freeRewards: [{ type: "FUEL", title: "500 Liter Fuel Garasi", amount: 500 }],
    premiumRewards: [{ type: "FUEL", title: "1.500 Liter Fuel Garasi", amount: 1500 }],
  },
  {
    level: 3,
    xpRequired: 3000,
    cumulativeXp: 7500,
    freeRewards: [{ type: "NC", title: "1.500 Nismara Coin", amount: 1500 }],
    premiumRewards: [
      { type: "NC", title: "3.500 Nismara Coin", amount: 3500 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Servis 25%",
        voucherCategory: "FLEET_MAINTENANCE",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 25,
      },
    ],
  },
  {
    level: 4,
    xpRequired: 3200,
    cumulativeXp: 10700,
    freeRewards: [
      {
        type: "VOUCHER",
        title: "Voucher Booster +25% NC (2 Jam)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 25,
        voucherDurationHours: 2,
      },
    ],
    premiumRewards: [{ type: "FUEL", title: "2.000 Liter Fuel Garasi", amount: 2000 }],
  },
  {
    level: 5,
    xpRequired: 3500,
    cumulativeXp: 14200,
    freeRewards: [{ type: "NC", title: "2.000 Nismara Coin", amount: 2000 }],
    premiumRewards: [
      { type: "NC", title: "5.000 Nismara Coin", amount: 5000 },
      { type: "SAFEBOX_TICKET", title: "1x Tiket Hapus Penalti (Safebox)", amount: 1 },
    ],
  },
  {
    level: 6,
    xpRequired: 3800,
    cumulativeXp: 18000,
    freeRewards: [{ type: "FUEL", title: "1.000 Liter Fuel Garasi", amount: 1000 }],
    premiumRewards: [
      { type: "FUEL", title: "2.500 Liter Fuel Garasi", amount: 2500 },
      {
        type: "VOUCHER",
        title: "Voucher Booster +50% NC (2 Jam)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
        voucherDurationHours: 2,
      },
    ],
  },
  {
    level: 7,
    xpRequired: 4000,
    cumulativeXp: 22000,
    freeRewards: [
      {
        type: "VOUCHER",
        title: "Kupon Diskon Servis 25%",
        voucherCategory: "FLEET_MAINTENANCE",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 25,
      },
    ],
    premiumRewards: [
      { type: "NC", title: "6.000 Nismara Coin", amount: 6000 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Servis 50%",
        voucherCategory: "FLEET_MAINTENANCE",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
      },
    ],
  },
  {
    level: 8,
    xpRequired: 4200,
    cumulativeXp: 26200,
    freeRewards: [{ type: "FUEL", title: "1.250 Liter Fuel Garasi", amount: 1250 }],
    premiumRewards: [{ type: "FUEL", title: "3.000 Liter Fuel Garasi", amount: 3000 }],
  },
  {
    level: 9,
    xpRequired: 4300,
    cumulativeXp: 30500,
    freeRewards: [{ type: "NC", title: "3.000 Nismara Coin", amount: 3000 }],
    premiumRewards: [
      { type: "NC", title: "7.500 Nismara Coin", amount: 7500 },
      { type: "SAFEBOX_TICKET", title: "1x Tiket Hapus Penalti (Safebox)", amount: 1 },
    ],
  },
  {
    level: 10,
    xpRequired: 4500,
    cumulativeXp: 35000,
    freeRewards: [
      { type: "NC", title: "5.000 Nismara Coin", amount: 5000 },
      { type: "FUEL", title: "2.000 Liter Fuel Garasi", amount: 2000 },
      { type: "SAFEBOX_TICKET", title: "1x Tiket Hapus Penalti (Safebox)", amount: 1 },
      { type: "BADGE", title: "S1 Bronze Hauler", badgeId: "s1_bronze" },
    ],
    premiumRewards: [
      { type: "NC", title: "12.000 Nismara Coin", amount: 12000 },
      { type: "FUEL", title: "4.000 Liter Fuel Garasi", amount: 4000 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Servis 50%",
        voucherCategory: "FLEET_MAINTENANCE",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
      },
      {
        type: "VOUCHER",
        title: "Voucher Booster +50% NC (6 Jam)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
        voucherDurationHours: 6,
      },
    ],
  },

  // TIER 2: PRO ZONE (Level 11 - 20)
  {
    level: 11,
    xpRequired: 5500,
    cumulativeXp: 40500,
    freeRewards: [{ type: "NC", title: "3.500 Nismara Coin", amount: 3500 }],
    premiumRewards: [
      { type: "NC", title: "8.000 Nismara Coin", amount: 8000 },
      { type: "FUEL", title: "3.000 Liter Fuel Garasi", amount: 3000 },
    ],
  },
  {
    level: 12,
    xpRequired: 6000,
    cumulativeXp: 46500,
    freeRewards: [{ type: "FUEL", title: "1.500 Liter Fuel Garasi", amount: 1500 }],
    premiumRewards: [
      { type: "FUEL", title: "4.000 Liter Fuel Garasi", amount: 4000 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Beli Fleet 10%",
        voucherCategory: "FLEET_BUY",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 10,
      },
    ],
  },
  {
    level: 13,
    xpRequired: 6500,
    cumulativeXp: 53000,
    freeRewards: [{ type: "NC", title: "4.000 Nismara Coin", amount: 4000 }],
    premiumRewards: [
      { type: "NC", title: "10.000 Nismara Coin", amount: 10000 },
      { type: "SAFEBOX_TICKET", title: "2x Tiket Hapus Penalti (Safebox)", amount: 2 },
    ],
  },
  {
    level: 14,
    xpRequired: 7000,
    cumulativeXp: 60000,
    freeRewards: [
      {
        type: "VOUCHER",
        title: "Voucher Booster +50% NC (2 Jam)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
        voucherDurationHours: 2,
      },
    ],
    premiumRewards: [
      { type: "FUEL", title: "5.000 Liter Fuel Garasi", amount: 5000 },
      {
        type: "VOUCHER",
        title: "Voucher Booster +50% NC (6 Jam)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
        voucherDurationHours: 6,
      },
    ],
  },
  {
    level: 15,
    xpRequired: 7500,
    cumulativeXp: 67500,
    freeRewards: [
      { type: "NC", title: "5.000 Nismara Coin", amount: 5000 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Beli Fleet 10%",
        voucherCategory: "FLEET_BUY",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 10,
      },
    ],
    premiumRewards: [
      { type: "NC", title: "12.500 Nismara Coin", amount: 12500 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Beli Fleet 15%",
        voucherCategory: "FLEET_BUY",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 15,
      },
    ],
  },
  {
    level: 16,
    xpRequired: 8000,
    cumulativeXp: 75500,
    freeRewards: [{ type: "FUEL", title: "2.500 Liter Fuel Garasi", amount: 2500 }],
    premiumRewards: [
      { type: "FUEL", title: "6.000 Liter Fuel Garasi", amount: 6000 },
      { type: "SAFEBOX_TICKET", title: "2x Tiket Hapus Penalti (Safebox)", amount: 2 },
    ],
  },
  {
    level: 17,
    xpRequired: 8500,
    cumulativeXp: 84000,
    freeRewards: [{ type: "NC", title: "6.000 Nismara Coin", amount: 6000 }],
    premiumRewards: [
      { type: "NC", title: "15.000 Nismara Coin", amount: 15000 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Servis 50%",
        voucherCategory: "FLEET_MAINTENANCE",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
      },
    ],
  },
  {
    level: 18,
    xpRequired: 9000,
    cumulativeXp: 93000,
    freeRewards: [
      {
        type: "VOUCHER",
        title: "Kupon Diskon Servis 50%",
        voucherCategory: "FLEET_MAINTENANCE",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
      },
    ],
    premiumRewards: [
      { type: "FUEL", title: "7.000 Liter Fuel Garasi", amount: 7000 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Beli Fleet 20%",
        voucherCategory: "FLEET_BUY",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 20,
      },
    ],
  },
  {
    level: 19,
    xpRequired: 9500,
    cumulativeXp: 102500,
    freeRewards: [{ type: "NC", title: "7.500 Nismara Coin", amount: 7500 }],
    premiumRewards: [
      { type: "NC", title: "18.000 Nismara Coin", amount: 18000 },
      {
        type: "VOUCHER",
        title: "Voucher Booster +50% NC (12 Jam)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
        voucherDurationHours: 12,
      },
    ],
  },
  {
    level: 20,
    xpRequired: 10500,
    cumulativeXp: 113000,
    freeRewards: [
      { type: "NC", title: "10.000 Nismara Coin", amount: 10000 },
      { type: "FUEL", title: "3.500 Liter Fuel Garasi", amount: 3500 },
      { type: "SAFEBOX_TICKET", title: "1x Tiket Hapus Penalti (Safebox)", amount: 1 },
      { type: "BADGE", title: "S1 Silver Pro", badgeId: "s1_silver" },
    ],
    premiumRewards: [
      { type: "NC", title: "25.000 Nismara Coin", amount: 25000 },
      { type: "FUEL", title: "7.500 Liter Fuel Garasi", amount: 7500 },
      {
        type: "VOUCHER",
        title: "Voucher Bebas Servis Armada (100% Free)",
        voucherCategory: "FLEET_MAINTENANCE",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 100,
      },
      { type: "NPLUS_TRIAL", title: "7 Hari Trial VIP Nismara+", amount: 7 },
    ],
  },

  // TIER 3: MASTER & HARDCORE ZONE (Level 21 - 30)
  {
    level: 21,
    xpRequired: 10500,
    cumulativeXp: 123500,
    freeRewards: [{ type: "NC", title: "8.000 Nismara Coin", amount: 8000 }],
    premiumRewards: [
      { type: "NC", title: "20.000 Nismara Coin", amount: 20000 },
      { type: "FUEL", title: "5.000 Liter Fuel Garasi", amount: 5000 },
    ],
  },
  {
    level: 22,
    xpRequired: 11000,
    cumulativeXp: 134500,
    freeRewards: [
      {
        type: "VOUCHER",
        title: "Voucher Booster +50% NC (6 Jam)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
        voucherDurationHours: 6,
      },
    ],
    premiumRewards: [
      { type: "FUEL", title: "7.000 Liter Fuel Garasi", amount: 7000 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Servis 50%",
        voucherCategory: "FLEET_MAINTENANCE",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
      },
    ],
  },
  {
    level: 23,
    xpRequired: 11500,
    cumulativeXp: 146000,
    freeRewards: [{ type: "NC", title: "10.000 Nismara Coin", amount: 10000 }],
    premiumRewards: [
      { type: "NC", title: "25.000 Nismara Coin", amount: 25000 },
      { type: "SAFEBOX_TICKET", title: "3x Tiket Hapus Penalti (Safebox)", amount: 3 },
    ],
  },
  {
    level: 24,
    xpRequired: 12000,
    cumulativeXp: 158000,
    freeRewards: [{ type: "FUEL", title: "4.000 Liter Fuel Garasi", amount: 4000 }],
    premiumRewards: [
      { type: "FUEL", title: "7.500 Liter Fuel Garasi", amount: 7500 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Beli Fleet 25%",
        voucherCategory: "FLEET_BUY",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 25,
      },
    ],
  },
  {
    level: 25,
    xpRequired: 12500,
    cumulativeXp: 170500,
    freeRewards: [
      { type: "NC", title: "12.500 Nismara Coin", amount: 12500 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Beli Fleet 15%",
        voucherCategory: "FLEET_BUY",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 15,
      },
    ],
    premiumRewards: [
      { type: "NC", title: "30.000 Nismara Coin", amount: 30000 },
      {
        type: "VOUCHER",
        title: "Voucher Booster +50% NC (24 Jam Marathon)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
        voucherDurationHours: 24,
      },
    ],
  },
  {
    level: 26,
    xpRequired: 13000,
    cumulativeXp: 183500,
    freeRewards: [{ type: "FUEL", title: "4.500 Liter Fuel Garasi", amount: 4500 }],
    premiumRewards: [
      { type: "FUEL", title: "8.000 Liter Fuel Garasi", amount: 8000 },
      { type: "SAFEBOX_TICKET", title: "3x Tiket Hapus Penalti (Safebox)", amount: 3 },
    ],
  },
  {
    level: 27,
    xpRequired: 13500,
    cumulativeXp: 197000,
    freeRewards: [
      {
        type: "VOUCHER",
        title: "Kupon Diskon Servis 50%",
        voucherCategory: "FLEET_MAINTENANCE",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
      },
    ],
    premiumRewards: [
      { type: "FUEL", title: "8.500 Liter Fuel Garasi", amount: 8500 },
      {
        type: "VOUCHER",
        title: "Kupon Diskon Beli Fleet 30%",
        voucherCategory: "FLEET_BUY",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 30,
      },
    ],
  },
  {
    level: 28,
    xpRequired: 14000,
    cumulativeXp: 211000,
    freeRewards: [
      { type: "FUEL", title: "5.000 Liter Fuel Garasi", amount: 5000 },
      { type: "SAFEBOX_TICKET", title: "1x Tiket Hapus Penalti (Safebox)", amount: 1 },
    ],
    premiumRewards: [
      { type: "FUEL", title: "9.000 Liter Fuel Garasi", amount: 9000 },
      {
        type: "VOUCHER",
        title: "Mega Booster +100% NC (6 Jam)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 100,
        voucherDurationHours: 6,
      },
    ],
  },
  {
    level: 29,
    xpRequired: 14000,
    cumulativeXp: 225000,
    freeRewards: [
      { type: "NC", title: "20.000 Nismara Coin", amount: 20000 },
      { type: "FUEL", title: "5.500 Liter Fuel Garasi", amount: 5500 },
    ],
    premiumRewards: [
      { type: "NC", title: "50.000 Nismara Coin", amount: 50000 },
      { type: "FUEL", title: "9.500 Liter Fuel Garasi", amount: 9500 },
      {
        type: "VOUCHER",
        title: "Voucher Bebas Servis Armada (100% Free)",
        voucherCategory: "FLEET_MAINTENANCE",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 100,
      },
      { type: "NPLUS_TRIAL", title: "14 Hari Trial VIP Nismara+", amount: 14 },
    ],
  },
  {
    level: 30,
    xpRequired: 25000,
    cumulativeXp: 250000,
    freeRewards: [
      { type: "NC", title: "35.000 Nismara Coin", amount: 35000 },
      { type: "FUEL", title: "6.000 Liter Fuel Garasi", amount: 6000 },
      {
        type: "VOUCHER",
        title: "Voucher Booster +50% NC (12 Jam)",
        voucherCategory: "NC_BOOSTER",
        voucherDiscountType: "percentage",
        voucherDiscountValue: 50,
        voucherDurationHours: 12,
      },
      { type: "BADGE", title: "S1 Master Driver", badgeId: "s1_master" },
    ],
    premiumRewards: [
      { type: "NC", title: "75.000 Nismara Coin", amount: 75000 },
      { type: "FUEL", title: "10.000 Liter Fuel Garasi", amount: 10000 },
      {
        type: "BADGE",
        title: "S1 Champion Legend",
        badgeId: "s1_champion",
      },
      {
        type: "DISCORD_ROLE",
        title: "Role Discord Eksklusif [S1 Champion]",
      },
      {
        type: "MOD_LIVERY",
        title: "Mod Livery Truk Eksklusif Season 1",
      },
    ],
  },
];

/**
 * Inisialisasi atau ambil SeasonPass aktif (Season 1)
 */
export async function ensureSeasonInitialized() {
  await dbConnect();

  let season = await SeasonPass.findOne({ seasonNumber: 1 });
  if (!season) {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

    season = await SeasonPass.create({
      seasonNumber: 1,
      title: "Season 1: Pioneer of Asphalt",
      subtitle: "Musim Perdana Penguasa Aspal",
      theme: "pioneer",
      startAt: startDate,
      endAt: endDate,
      status: "ACTIVE",
      totalXp: 250000,
      weeklyCapXp: 20000,
      finalRushWeeks: 2,
      levels: SEASON_1_LEVELS,
      grandPrize: {
        title: "Mod Livery Truk Eksklusif Season 1",
        description: "Livery resmi edisi terbatas Season 1 untuk truk Scania & Volvo",
        type: "MOD_LIVERY",
        downloadUrl: "https://transport.nismara.web.id/mods/season1-livery.zip",
        imageUrl: "/images/season1-livery.webp",
      },
      premiumPriceIdr: 35000,
      levelPriceIdr: 2000,
    });
  } else if (!season.levelPriceIdr) {
    season.levelPriceIdr = 2000;
    await SeasonPass.updateOne(
      { _id: season._id },
      { $set: { levelPriceIdr: 2000 } }
    );
  }

  // Pre-seed semua Master Achievement Season agar langsung muncul di Manage Achievement
  if (season?.levels) {
    for (const lvl of season.levels) {
      const allRewards = [...(lvl.freeRewards || []), ...(lvl.premiumRewards || [])];
      for (const r of allRewards) {
        if (r.type === "BADGE" && r.badgeId) {
          const codeId = `PASS_${r.badgeId.toUpperCase()}`;
          const slug = `season-${season.seasonNumber}-${r.badgeId.toLowerCase().replace(/_/g, "-")}`;
          const exist = await Achievement.findOne({ codeId });
          if (!exist) {
            await Achievement.create({
              codeId,
              slug,
              name: r.title,
              description: `Penghargaan Milestone Resmi Nismara Pass Season ${season.seasonNumber} (Level ${lvl.level})`,
              category: "event",
              imageUrl: r.imageUrl || `/images/badges/${r.badgeId}.webp`,
            });
          }
        }
      }
    }
  }

  return season;
}

export async function getActiveSeason() {
  await dbConnect();
  const now = new Date();
  const season = await SeasonPass.findOne({
    status: "ACTIVE",
    startAt: { $lte: now },
    endAt: { $gte: now },
  }).lean();
  return season;
}

export async function getLatestSeason() {
  await dbConnect();
  let season = await getActiveSeason();
  if (!season) {
    season = await SeasonPass.findOne({}).sort({ seasonNumber: -1 }).lean();
  }
  return season;
}

export async function getUserSeasonProgress(
  discordId?: string | number | null,
  seasonNumber: number = 1
) {
  if (!discordId) return null;
  await dbConnect();

  let progress = await UserSeasonProgress.findOne({
    discordId: String(discordId),
    seasonNumber,
  });

  if (!progress) {
    const user = await User.findOne({ discordId: String(discordId) });
    if (!user) return null;

    progress = await UserSeasonProgress.create({
      seasonNumber,
      userId: user._id,
      discordId: String(discordId),
      guildId: process.env.DISCORD_GUILD_ID || "863959415702028318",
      currentXp: 0,
      currentLevel: 0,
      isPremium: false,
      claimedFreeLevels: [],
      claimedPremiumLevels: [],
      levelSkipsPurchased: 0,
      weeklyXpLogs: [],
    });
  }

  return progress;
}

/**
 * Menghitung status minggu, kuota server akumulatif, dan status final rush
 */
export function getSeasonWeekInfo(season: any, isPremium: boolean = false) {
  const now = new Date();
  const start = new Date(season.startAt);
  const end = new Date(season.endAt);

  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
  const currentWeekNumber = Math.min(13, Math.floor(diffDays / 7) + 1);

  const totalWeeks = 13;
  const isFinalRush = currentWeekNumber >= (totalWeeks - (season.finalRushWeeks || 2) + 1);

  const baseWeeklyCap = season.weeklyCapXp || 20000;
  const userWeeklyCap = isPremium ? baseWeeklyCap * 2 : baseWeeklyCap;

  // Kuota server akumulatif:
  // - Free Track: currentWeek * 20.000 XP
  // - Premium Pass: currentWeek * 40.000 XP (2x Lipat Limit)
  // - Final Rush: Bebas (999.999 XP)
  const serverCumulativeCapXp = isFinalRush
    ? 999999
    : currentWeekNumber * userWeeklyCap;

  const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

  return {
    currentWeekNumber,
    isFinalRush,
    baseWeeklyCap,
    userWeeklyCap,
    serverCumulativeCapXp,
    daysRemaining,
    isPremium,
  };
}

/**
 * Menghitung level tertinggi yang telah berhasil diselesaikan & dibuka hadiahnya berdasarkan cumulative XP
 */
export function calculateUnlockedLevel(currentXp: number, levels: SeasonLevelConfig[]): number {
  if (!levels || levels.length === 0) return 0;

  let unlocked = 0;
  for (const lvl of levels) {
    if (currentXp >= lvl.cumulativeXp) {
      unlocked = lvl.level;
    } else {
      break;
    }
  }

  return unlocked;
}

/**
 * Menghitung level yang telah dicapai (0-30) berdasarkan total akumulasi XP
 */
export function calculateLevelFromXp(currentXp: number, levels: SeasonLevelConfig[]): number {
  return calculateUnlockedLevel(currentXp, levels);
}

/**
 * Menambahkan Seasonal XP ke driver (misal dari Job Selesai)
 */
export async function addSeasonXp(
  discordId: string | number,
  baseXpAmount: number,
  reason: string = "Job Delivery XP"
) {
  await dbConnect();

  const season = await getActiveSeason();
  if (!season) return { success: false, error: "Tidak ada musim aktif" };

  const progress = await getUserSeasonProgress(discordId, season.seasonNumber);
  if (!progress) return { success: false, error: "Progress user tidak ditemukan" };

  const weekInfo = getSeasonWeekInfo(season, progress.isPremium);

  // Jika Final Rush, dapat Double Pass XP (2x)
  let xpToAdd = weekInfo.isFinalRush ? baseXpAmount * 2 : baseXpAmount;

  // 1. Dapatkan log perolehan XP untuk minggu berjalan
  const weekLog = progress.weeklyXpLogs.find(
    (w: any) => w.weekNumber === weekInfo.currentWeekNumber
  );
  const currentWeekGained = weekLog ? Number(weekLog.xpGained || 0) : 0;

  // 2. Proteksi Ganda Batas XP Mingguan:
  // - Batas Per Minggu Berjalan (20.000 Free / 40.000 Premium)
  // - Batas Akumulatif Server Sampai Minggu Tersebut
  if (!weekInfo.isFinalRush) {
    const weeklyRemaining = Math.max(0, weekInfo.userWeeklyCap - currentWeekGained);
    const cumulativeRemaining = Math.max(0, weekInfo.serverCumulativeCapXp - progress.currentXp);
    const maxAllowed = Math.min(weeklyRemaining, cumulativeRemaining);

    if (xpToAdd > maxAllowed) {
      xpToAdd = Math.max(0, maxAllowed);
    }
  } else {
    // Mode Final Rush: Bebas hingga batas maksimum level 30 (totalXp)
    const maxPossibleXp = season.totalXp || 250000;
    if (progress.currentXp + xpToAdd > maxPossibleXp) {
      xpToAdd = Math.max(0, maxPossibleXp - progress.currentXp);
    }
  }

  if (xpToAdd <= 0) {
    return {
      success: true,
      xpAdded: 0,
      currentXp: progress.currentXp,
      currentLevel: progress.currentLevel,
      capped: true,
      message: `Batas perolehan Seasonal XP mingguan telah tercapai (${weekInfo.userWeeklyCap.toLocaleString("id-ID")} XP/minggu).`,
    };
  }

  progress.currentXp += xpToAdd;
  progress.currentLevel = calculateLevelFromXp(progress.currentXp, season.levels);

  // Update weekly logs
  if (weekLog) {
    weekLog.xpGained += xpToAdd;
    weekLog.lastUpdated = new Date();
  } else {
    progress.weeklyXpLogs.push({
      weekNumber: weekInfo.currentWeekNumber,
      xpGained: xpToAdd,
      lastUpdated: new Date(),
    });
  }

  await progress.save();

  return {
    success: true,
    xpAdded: xpToAdd,
    currentXp: progress.currentXp,
    currentLevel: progress.currentLevel,
    isFinalRush: weekInfo.isFinalRush,
  };
}

/**
 * Klaim hadiah untuk level tertentu (Free Track atau Premium Track)
 */
export async function claimLevelReward(
  discordId: string | number,
  seasonNumber: number,
  levelNum: number,
  track: "free" | "premium"
) {
  await dbConnect();

  const season = await SeasonPass.findOne({ seasonNumber });
  if (!season) return { success: false, error: "Musim tidak ditemukan" };

  const levelConfig = season.levels.find((l: any) => l.level === Number(levelNum));
  if (!levelConfig) return { success: false, error: `Level ${levelNum} tidak ditemukan` };

  const updateField = track === "free" ? "claimedFreeLevels" : "claimedPremiumLevels";

  // ATOMIC GUARD: Hanya update & klaim jika total cumulativeXp sudah tercapai, track valid, dan BELUM PERNAH diklaim
  // Mencegah eksploitasi spam klik / race condition secara 100% atomik di level MongoDB engine
  const progress = await UserSeasonProgress.findOneAndUpdate(
    {
      discordId: String(discordId),
      seasonNumber: Number(seasonNumber),
      currentXp: { $gte: Number(levelConfig.cumulativeXp) },
      ...(track === "premium" ? { isPremium: true } : {}),
      [updateField]: { $ne: Number(levelNum) },
    },
    {
      $addToSet: { [updateField]: Number(levelNum) },
    },
    { returnDocument: "after" }
  );

  if (!progress) {
    // Jika atomik gagal, cari penyebab spesifik untuk error message yang jelas
    const existing = await UserSeasonProgress.findOne({
      discordId: String(discordId),
      seasonNumber: Number(seasonNumber),
    });

    if (!existing) return { success: false, error: "Progress user tidak ditemukan" };
    if (existing.currentXp < Number(levelConfig.cumulativeXp)) {
      return {
        success: false,
        error: `Level ${levelNum} belum terbuka (Memerlukan ${levelConfig.cumulativeXp.toLocaleString("id-ID")} XP, akumulasi XP Anda saat ini: ${existing.currentXp.toLocaleString("id-ID")} XP)`,
      };
    }
    if (track === "premium" && !existing.isPremium) {
      return {
        success: false,
        error: "Anda belum mengupgrade ke Nismara Pass Premium",
      };
    }
    const alreadyClaimed =
      track === "free"
        ? existing.claimedFreeLevels.includes(Number(levelNum))
        : existing.claimedPremiumLevels.includes(Number(levelNum));
    if (alreadyClaimed) {
      return {
        success: false,
        error: `Hadiah ${track === "free" ? "gratis" : "premium"} level ${levelNum} sudah diklaim`,
      };
    }

    return { success: false, error: "Gagal mengklaim hadiah" };
  }

  const rewardsToGrant: RewardItem[] = track === "free" ? levelConfig.freeRewards : levelConfig.premiumRewards;
  const user = await User.findOne({ discordId: String(discordId) });
  if (!user) return { success: false, error: "User tidak ditemukan" };

  const guildId = process.env.DISCORD_GUILD_ID || "863959415702028318";
  const results: string[] = [];

  // Tracker untuk multi-collection rollback jika terjadi error saat mendistribusikan reward
  let ncGranted = 0;
  let fuelGranted = 0;
  let safeboxTicketsGranted = 0;
  const createdVoucherIds: any[] = [];
  let previousNPlusState: any = null;
  let nplusUpdated = false;
  const createdUserAchIds: any[] = [];

  try {
    // Eksekusi penyerahan masing-masing hadiah
    for (const r of rewardsToGrant) {
      if (r.type === "NC" && r.amount && r.amount > 0) {
        // 1. Tambah NC di currencies collection
        await mongoose.connection.collection("currencies").updateOne(
          { userId: String(discordId), guildId },
          { $inc: { totalNC: r.amount } },
          { upsert: true }
        );
        // Log ke currencyhistories
        await mongoose.connection.collection("currencyhistories").insertOne({
          userId: String(discordId),
          guildId,
          amount: r.amount,
          type: "earn",
          reason: `Hadiah Nismara Pass S${seasonNumber} (Level ${levelNum} - ${track.toUpperCase()})`,
          createdAt: new Date(),
        });
        ncGranted += r.amount;
        results.push(`+${r.amount.toLocaleString("id-ID")} NC`);
      } else if (r.type === "FUEL" && r.amount && r.amount > 0) {
        // 2. Tambah Fuel ke Garasi
        await Garage.updateOne(
          { discordId: String(discordId) },
          { 
            $inc: { fuelStock: r.amount },
            $setOnInsert: {
              fleetSlot: 1,
              fleetSlotUsed: 0,
              fleetSlotLevel: 1,
              safeboxLevel: 1,
              fuelCapacity: 2000,
              fuelTankLevel: 1,
              operational_cost: 0,
              status: "active",
              createdAt: new Date(),
            }
          },
          { upsert: true }
        );
        fuelGranted += r.amount;
        results.push(`+${r.amount.toLocaleString("id-ID")} Liter Fuel`);
      } else if (r.type === "SAFEBOX_TICKET" && r.amount && r.amount > 0) {
        // 3. Tambah Tiket Safebox
        await Garage.updateOne(
          { discordId: String(discordId) },
          { 
            $inc: { safeboxStock: r.amount },
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
        safeboxTicketsGranted += r.amount;
        results.push(`+${r.amount}x Tiket Safebox Hapus Penalti`);
      } else if (r.type === "VOUCHER" && r.voucherCategory) {
        // 4. Terbitkan UserVoucher
        const createdVoucher = await grantVoucher({
          userId: user._id,
          discordId: String(discordId),
          guildId,
          title: r.title,
          description: r.description || `Hadiah dari Nismara Pass Season ${seasonNumber} Level ${levelNum}`,
          category: r.voucherCategory,
          discountType: r.voucherDiscountType || "percentage",
          discountValue: r.voucherDiscountValue || 0,
          durationHours: r.voucherDurationHours || 0,
          source: `SEASONAL_PASS_S${seasonNumber}`,
          expiresInDays: 90,
        });
        if (createdVoucher?._id) {
          createdVoucherIds.push(createdVoucher._id);
        }
        results.push(`Kupon: ${r.title}`);
      } else if (r.type === "NPLUS_TRIAL" && r.amount && r.amount > 0) {
        // 5. Perpanjang / Aktifkan Nismara+ VIP
        const now = new Date();
        const currentNPlus = user.nismaraplus || {};
        previousNPlusState = currentNPlus ? JSON.parse(JSON.stringify(currentNPlus)) : null;
        const durationMs = r.amount * 24 * 60 * 60 * 1000;

        let newStartedAt = now;
        let newExpiredAt = new Date(now.getTime() + durationMs);

        // Jika user sudah aktif dan belum expired, perpanjang masa aktif dari expiredAt yang sudah ada!
        if (
          currentNPlus.status &&
          currentNPlus.expiredAt &&
          new Date(currentNPlus.expiredAt) > now
        ) {
          newStartedAt = currentNPlus.startedAt ? new Date(currentNPlus.startedAt) : now;
          newExpiredAt = new Date(new Date(currentNPlus.expiredAt).getTime() + durationMs);
        }

        await User.updateOne(
          { discordId: String(discordId) },
          {
            $set: {
              "nismaraplus.status": true,
              "nismaraplus.startedAt": newStartedAt,
              "nismaraplus.expiredAt": newExpiredAt,
            },
          }
        );
        nplusUpdated = true;

        // Berikan Role Discord Nismara+ jika bot token dan role ID tersedia (non-fatal)
        const botToken = process.env.DISCORD_BOT_TOKEN;
        const guildId = process.env.DISCORD_GUILD_ID;
        const plusRoleId = process.env.DISCORD_NISMARAPLUS_ROLE_ID;
        if (botToken && guildId && plusRoleId) {
          try {
            await fetch(
              `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${plusRoleId}`,
              {
                method: "PUT",
                headers: {
                  Authorization: `Bot ${botToken}`,
                  "X-Audit-Log-Reason": `Nismara+ Trial ${r.amount} Hari (Season Pass S${seasonNumber})`,
                },
              }
            );
          } catch (discordErr) {
            console.error("Discord Role Error (non-fatal):", discordErr);
          }
        }

        // Hapus cache session Redis agar profil driver langsung update (non-fatal)
        try {
          const { redis } = await import("@/lib/redis");
          if (redis) {
            await redis.del(`session:profile:${user._id}`);
          }
        } catch (redisErr) {
          // ignore redis error
        }

        results.push(`+${r.amount} Hari VIP Nismara+ (Aktif s.d. ${newExpiredAt.toLocaleDateString("id-ID")})`);
      } else if (r.type === "BADGE" && r.badgeId) {
        // 6. Masukkan ke Koleksi Achievement & UserAchievement agar tampil di Profil Driver
        try {
          const codeId = `PASS_${r.badgeId.toUpperCase()}`;
          const slug = `season-${progress.seasonNumber}-${r.badgeId.toLowerCase().replace(/_/g, "-")}`;

          let ach = await Achievement.findOne({ codeId });
          if (!ach) {
            ach = await Achievement.create({
              codeId,
              slug,
              name: r.title,
              description: `Penghargaan Milestone Resmi Nismara Pass Season ${progress.seasonNumber}`,
              category: "event",
              imageUrl: `/images/badges/${r.badgeId}.webp`,
            });
          }

          const existingGrant = await UserAchievement.findOne({
            discordId: String(progress.discordId),
            achievementId: ach._id,
          });

          if (!existingGrant) {
            const newAch = await UserAchievement.create({
              discordId: String(progress.discordId),
              truckyId: user.truckyId ? String(user.truckyId) : "",
              achievementId: ach._id,
              remarks: `Hadiah Nismara Pass Season ${progress.seasonNumber} (Level ${levelNum})`,
            });
            if (newAch?._id) {
              createdUserAchIds.push(newAch._id);
            }
          }

          results.push(`Badge: ${r.title}`);
        } catch (badgeErr) {
          console.error("Badge Grant Error (non-fatal):", badgeErr);
          results.push(r.title);
        }
      } else if (
        r.type === "MOD_LIVERY" ||
        r.type === "PHYSICAL_MERCH" ||
        r.type === "DOWNLOADABLE" ||
        r.type === "DISCORD_ROLE"
      ) {
        results.push(r.title);
      }
    }

    return {
      success: true,
      message: `Berhasil mengklaim Level ${levelNum} (${track.toUpperCase()}): ${results.join(", ")}`,
      claimedRewards: results,
    };
  } catch (err: any) {
    console.error(`Gagal memberikan reward Season Pass Level ${levelNum} (${track}), menjalankan rollback:`, err);

    // Rollback Voucher
    if (createdVoucherIds.length > 0) {
      try {
        await UserVoucher.deleteMany({ _id: { $in: createdVoucherIds } });
      } catch (rbVoucherErr) {
        console.error("Rollback voucher failed:", rbVoucherErr);
      }
    }

    // Rollback Fuel
    if (fuelGranted > 0) {
      try {
        await Garage.updateOne(
          { discordId: String(discordId) },
          { $inc: { fuelStock: -fuelGranted } }
        );
      } catch (rbFuelErr) {
        console.error("Rollback fuel failed:", rbFuelErr);
      }
    }

    // Rollback Safebox Tickets
    if (safeboxTicketsGranted > 0) {
      try {
        await Garage.updateOne(
          { discordId: String(discordId) },
          { $inc: { safeboxStock: -safeboxTicketsGranted } }
        );
      } catch (rbSafeboxErr) {
        console.error("Rollback safebox ticket failed:", rbSafeboxErr);
      }
    }

    // Rollback NC
    if (ncGranted > 0) {
      try {
        await mongoose.connection.collection("currencies").updateOne(
          { userId: String(discordId), guildId },
          { $inc: { totalNC: -ncGranted } }
        );
        await mongoose.connection.collection("currencyhistories").insertOne({
          userId: String(discordId),
          guildId,
          amount: ncGranted,
          type: "spend",
          reason: `[ROLLBACK] Koreksi kegagalan klaim Season Pass S${seasonNumber} Level ${levelNum}`,
          createdAt: new Date(),
        });
      } catch (rbNcErr) {
        console.error("Rollback NC failed:", rbNcErr);
      }
    }

    // Rollback NPlus
    if (nplusUpdated && previousNPlusState) {
      try {
        await User.updateOne(
          { discordId: String(discordId) },
          { $set: { nismaraplus: previousNPlusState } }
        );
      } catch (rbNPlusErr) {
        console.error("Rollback NPlus failed:", rbNPlusErr);
      }
    }

    // Rollback UserAchievement
    if (createdUserAchIds.length > 0) {
      try {
        await UserAchievement.deleteMany({ _id: { $in: createdUserAchIds } });
      } catch (rbAchErr) {
        console.error("Rollback achievement failed:", rbAchErr);
      }
    }

    // PENTING: Rollback gate pada UserSeasonProgress agar level tidak hangus dan user tetap bisa mengklaim ulang!
    try {
      await UserSeasonProgress.updateOne(
        { discordId: String(discordId), seasonNumber: Number(seasonNumber) },
        { $pull: { [updateField]: Number(levelNum) } }
      );
    } catch (gateErr) {
      console.error("Rollback Season Pass gate failed:", gateErr);
    }

    return {
      success: false,
      error: `Terjadi kendala saat memproses hadiah Level ${levelNum}: ${err.message || "Unknown error"}. Sistem telah melakukan rollback otomatis sehingga hadiah Anda tidak hangus dan dapat dicoba klaim kembali.`,
    };
  }
}

/**
 * Klaim semua hadiah yang sudah terbuka dan belum diklaim
 */
export async function claimAllAvailableRewards(
  discordId: string | number,
  seasonNumber: number = 1
) {
  await dbConnect();

  const season = await SeasonPass.findOne({ seasonNumber });
  if (!season) return { success: false, error: "Musim tidak ditemukan" };

  const progress = await getUserSeasonProgress(discordId, seasonNumber);
  if (!progress) return { success: false, error: "Progress user tidak ditemukan" };

  const claimedResults: string[] = [];
  const failedLevels: { level: number; track: string; error: string }[] = [];
  const unlockedLevel = calculateUnlockedLevel(progress.currentXp, season.levels);

  for (let lvl = 1; lvl <= unlockedLevel; lvl++) {
    // Claim Free Track jika belum
    if (!progress.claimedFreeLevels.includes(lvl)) {
      try {
        const freeRes = await claimLevelReward(discordId, seasonNumber, lvl, "free");
        if (freeRes.success && freeRes.claimedRewards) {
          claimedResults.push(...freeRes.claimedRewards);
          progress.claimedFreeLevels.push(lvl);
        } else if (!freeRes.success) {
          failedLevels.push({ level: lvl, track: "free", error: freeRes.error || "Gagal" });
        }
      } catch (freeErr: any) {
        failedLevels.push({ level: lvl, track: "free", error: freeErr.message || "Unknown error" });
      }
    }

    // Claim Premium Track jika user premium dan belum klaim
    if (progress.isPremium && !progress.claimedPremiumLevels.includes(lvl)) {
      try {
        const premRes = await claimLevelReward(discordId, seasonNumber, lvl, "premium");
        if (premRes.success && premRes.claimedRewards) {
          claimedResults.push(...premRes.claimedRewards);
          progress.claimedPremiumLevels.push(lvl);
        } else if (!premRes.success) {
          failedLevels.push({ level: lvl, track: "premium", error: premRes.error || "Gagal" });
        }
      } catch (premErr: any) {
        failedLevels.push({ level: lvl, track: "premium", error: premErr.message || "Unknown error" });
      }
    }
  }

  return {
    success: true,
    totalClaimedCount: claimedResults.length,
    claimedResults,
    failedLevels,
    hasFailures: failedLevels.length > 0,
    message:
      failedLevels.length > 0
        ? `Berhasil mengklaim ${claimedResults.length} hadiah. Terdapat ${failedLevels.length} level yang mengalami kendala dan telah di-rollback secara otomatis agar tidak hangus dan bisa Anda coba klaim kembali.`
        : `Berhasil mengklaim ${claimedResults.length} hadiah sekaligus!`,
  };
}

/**
 * Upgrade akun ke Nismara Pass Premium
 */
export async function upgradeToPremiumPass(
  discordId: string | number,
  seasonNumber: number = 1
) {
  await dbConnect();

  // ATOMIC GUARD: Hanya update jika isPremium belum bernilai true
  const progress = await UserSeasonProgress.findOneAndUpdate(
    {
      discordId: String(discordId),
      seasonNumber: Number(seasonNumber),
      isPremium: { $ne: true },
    },
    {
      $set: { isPremium: true, purchasedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  if (!progress) {
    const existing = await UserSeasonProgress.findOne({
      discordId: String(discordId),
      seasonNumber: Number(seasonNumber),
    });
    if (existing?.isPremium) {
      return { success: false, error: "Anda sudah memiliki Nismara Pass Premium musim ini!" };
    }
    return { success: false, error: "Progress user tidak ditemukan" };
  }

  return {
    success: true,
    message: `Selamat! Nismara Pass Premium Season ${seasonNumber} Anda telah aktif.`,
  };
}

/**
 * Terapkan Level Skip ke progress driver (meningkatkan level dan cumulative XP secara instan)
 */
export async function applySeasonLevelSkip(
  discordId: string | number,
  seasonNumber: number,
  levelCount: number
) {
  await dbConnect();

  const season = await SeasonPass.findOne({ seasonNumber: Number(seasonNumber) });
  if (!season) return { success: false, error: "Musim tidak ditemukan" };

  const progress = await getUserSeasonProgress(discordId, seasonNumber);
  if (!progress) return { success: false, error: "Progress user tidak ditemukan" };

  const count = Math.max(1, Math.floor(Number(levelCount)));
  const currentLvl = calculateLevelFromXp(progress.currentXp, season.levels);
  const targetLevel = Math.min(30, currentLvl + count);

  // Ambil cumulative XP target level
  const targetLevelConfig = season.levels.find((l: any) => l.level === targetLevel);
  if (!targetLevelConfig) {
    return { success: false, error: `Konfigurasi Level ${targetLevel} tidak ditemukan` };
  }

  const targetCumulativeXp = targetLevelConfig.cumulativeXp;
  const newXp = Math.max(progress.currentXp, targetCumulativeXp);
  const newLevel = calculateLevelFromXp(newXp, season.levels);

  progress.currentXp = newXp;
  progress.currentLevel = newLevel;
  progress.levelSkipsPurchased = (progress.levelSkipsPurchased || 0) + count;
  await progress.save();

  return {
    success: true,
    previousLevel: currentLvl,
    newLevel: progress.currentLevel,
    currentXp: progress.currentXp,
    levelSkipsPurchased: progress.levelSkipsPurchased,
    message: `Berhasil meningkatkan ${count} level ke Level ${progress.currentLevel}!`,
  };
}

export interface SeasonPassFeatureStatus {
  isEnabled: boolean;
  disabledReason: string;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Mengambil status aktif/nonaktif fitur Season Pass secara global
 */
export async function getSeasonPassFeatureStatus(): Promise<SeasonPassFeatureStatus> {
  try {
    await dbConnect();
    const setting = await SystemSetting.findOne({ key: "season_pass" }).lean();
    if (!setting || setting.value === undefined) {
      return {
        isEnabled: true,
        disabledReason: "",
      };
    }

    if (typeof setting.value === "boolean") {
      return {
        isEnabled: setting.value,
        disabledReason: setting.description || "",
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy,
      };
    }

    return {
      isEnabled: Boolean(setting.value.isEnabled ?? true),
      disabledReason: setting.value.disabledReason || "",
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy,
    };
  } catch (error) {
    console.error("Gagal mengambil status fitur Season Pass:", error);
    return {
      isEnabled: true,
      disabledReason: "",
    };
  }
}

/**
 * Mengubah status aktif/nonaktif fitur Season Pass secara global
 */
export async function setSeasonPassFeatureStatus(
  isEnabled: boolean,
  disabledReason: string = "",
  updatedBy: string = ""
): Promise<SeasonPassFeatureStatus> {
  await dbConnect();
  const updated = await SystemSetting.findOneAndUpdate(
    { key: "season_pass" },
    {
      $set: {
        value: {
          isEnabled: Boolean(isEnabled),
          disabledReason: disabledReason || "",
        },
        description: disabledReason || (isEnabled ? "Fitur Season Pass Aktif" : "Fitur Season Pass Dinonaktifkan"),
        updatedBy: updatedBy || "manager",
      },
    },
    { upsert: true, new: true }
  ).lean();

  return {
    isEnabled: Boolean(updated?.value?.isEnabled ?? isEnabled),
    disabledReason: updated?.value?.disabledReason || disabledReason,
    updatedAt: updated?.updatedAt,
    updatedBy: updated?.updatedBy,
  };
}


