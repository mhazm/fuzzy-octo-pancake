import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import dbConnect from "@/lib/mongoose";

export async function getUserAggregatedStats(discordId: string, userIdObj: any) {
  await dbConnect();
  const client = await clientPromise;
  const db = client.db();

  // Job Stats
  const jobStatsArr = await db.collection("jobhistories").aggregate([
    { $match: { driverId: discordId } },
    {
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        totalCompleted: { $sum: { $cond: [{ $eq: ["$jobStatus", "COMPLETED"] }, 1, 0] } },
        totalCanceled: { $sum: { $cond: [{ $eq: ["$jobStatus", "CANCELED"] }, 1, 0] } },
        totalNcEarned: { $sum: { $cond: [{ $eq: ["$jobStatus", "COMPLETED"] }, "$nc.total", 0] } },
        totalNcCost: { $sum: { $cond: [{ $eq: ["$jobStatus", "COMPLETED"] }, "$ncCost.total", 0] } },
        totalDistanceKm: { $sum: { $cond: [{ $eq: ["$jobStatus", "COMPLETED"] }, "$distanceKm", 0] } },
        totalXpEarned: { $sum: { $cond: [{ $eq: ["$jobStatus", "COMPLETED"] }, "$xp.total", 0] } },
        totalPenalty: { $sum: { $cond: [{ $eq: ["$jobStatus", "COMPLETED"] }, "$penalty.total", 0] } },
        specialContractJobs: { $sum: { $cond: [{ $and: [{ $eq: ["$jobStatus", "COMPLETED"] }, "$isSpecialContract"] }, 1, 0] } },
        specialContractIncome: { $sum: { $cond: [{ $and: [{ $eq: ["$jobStatus", "COMPLETED"] }, "$isSpecialContract"] }, "$nc.total", 0] } },
        hardcoreJobs: { $sum: { $cond: [{ $and: [{ $eq: ["$jobStatus", "COMPLETED"] }, "$isHardcore"] }, 1, 0] } },
        hardcoreRatingSum: { $sum: { $cond: [{ $and: [{ $eq: ["$jobStatus", "COMPLETED"] }, "$isHardcore"] }, "$hardcoreRating", 0] } },
      }
    }
  ]).toArray();
  const jobStats = jobStatsArr[0] || {};

  // Lotto Stats
  const lottoStatsArr = await db.collection("lottotickets").aggregate([
    { $match: { discordId } },
    {
      $group: {
        _id: null,
        totalTickets: { $sum: 1 },
        totalWon: { $sum: "$prizeWon" },
        wins: { $sum: { $cond: [{ $in: ["$status", ["WIN_TIER_1", "WIN_TIER_2", "WIN_TIER_3"]] }, 1, 0] } },
      }
    }
  ]).toArray();
  const lottoStats = lottoStatsArr[0] || {};

  // Scratch Stats
  const scratchStatsArr = await db.collection("scratchtickets").aggregate([
    { $match: { discordId } },
    {
      $group: {
        _id: null,
        totalTickets: { $sum: 1 },
        totalSpent: { $sum: "$price" },
        totalWon: { $sum: "$prizeWon" },
        wins: { $sum: { $cond: ["$isWinning", 1, 0] } },
      }
    }
  ]).toArray();
  const scratchStats = scratchStatsArr[0] || {};

  // Racing Stats
  const racingStatsArr = await db.collection("racingtickets").aggregate([
    { $match: { discordId } },
    {
      $group: {
        _id: null,
        totalBets: { $sum: 1 },
        totalBetAmount: { $sum: "$betAmount" },
        totalWon: { $sum: "$prizeWon" },
        wins: { $sum: { $cond: ["$isWinning", 1, 0] } },
      }
    }
  ]).toArray();
  const racingStats = racingStatsArr[0] || {};

  // Fleet Stats
  const Fleet = mongoose.models.Fleet || require("@/lib/models/Fleet").default;
  const fleets = userIdObj ? await Fleet.find({ owner: userIdObj.toString() }).lean() : [];

  // Market Stats
  const marketStatsArr = await db.collection("marketpurchases").aggregate([
    { $match: { buyerId: discordId } },
    { $group: { _id: null, totalPurchases: { $sum: 1 }, totalSpent: { $sum: "$pricePaid" } } }
  ]).toArray();
  const marketStats = marketStatsArr[0] || {};

  // Validated Jobs
  const validatedStatsArr = await db.collection("validatedjobs").aggregate([
    { $match: { userId: discordId } },
    { $group: { _id: null, totalValidated: { $sum: 1 }, totalDeducted: { $sum: "$deducted" } } }
  ]).toArray();
  const validatedStats = validatedStatsArr[0] || {};

  // Convoy Stats
  const convoys = await db.collection("convoylobbies").find({
    $or: [
      { interested: discordId },
      { "partisipan.discordId": discordId }
    ]
  }).toArray();
  let convoyInterested = 0;
  let convoyJoined = 0;
  convoys.forEach(c => {
    if (c.interested?.includes(discordId)) convoyInterested++;
    if (c.partisipan?.some((p: any) => p.discordId === discordId)) convoyJoined++;
  });

  // Achievements
  const achievementStatsArr = await db.collection("userachievements").aggregate([
    { $match: { discordId } },
    { $group: { _id: null, totalAchievements: { $sum: 1 } } }
  ]).toArray();
  const achievementStats = achievementStatsArr[0] || {};

  // Gallery
  const galleryPostsArr = await db.collection("gallery_posts").aggregate([
    { $match: { userId: discordId } },
    { $group: { _id: null, totalPosts: { $sum: 1 } } }
  ]).toArray();
  const galleryPosts = galleryPostsArr[0] || {};

  const galleryCommentsArr = await db.collection("gallery_comments").aggregate([
    { $match: { userId: discordId } },
    { $group: { _id: null, totalComments: { $sum: 1 } } }
  ]).toArray();
  const galleryComments = galleryCommentsArr[0] || {};

  return {
    jobs: {
      total: jobStats.totalJobs || 0,
      completed: jobStats.totalCompleted || 0,
      canceled: jobStats.totalCanceled || 0,
      ncEarned: Math.round(jobStats.totalNcEarned || 0),
      ncCost: Math.round(jobStats.totalNcCost || 0),
      netIncome: Math.round((jobStats.totalNcEarned || 0) - (jobStats.totalNcCost || 0)),
      distanceKm: Math.round(jobStats.totalDistanceKm || 0),
      avgDistanceKm: jobStats.totalCompleted ? Math.round(jobStats.totalDistanceKm / jobStats.totalCompleted) : 0,
      xpEarned: Math.round(jobStats.totalXpEarned || 0),
      totalPenalty: Math.round(jobStats.totalPenalty || 0),
      specialContractJobs: jobStats.specialContractJobs || 0,
      specialContractIncome: Math.round(jobStats.specialContractIncome || 0),
      hardcoreJobs: jobStats.hardcoreJobs || 0,
      hardcoreRatingAvg: jobStats.hardcoreJobs ? (jobStats.hardcoreRatingSum / jobStats.hardcoreJobs).toFixed(1) : "0",
      validatedJobs: validatedStats.totalValidated || 0,
      validatedPointsDeducted: validatedStats.totalDeducted || 0,
    },
    lotto: {
      tickets: lottoStats.totalTickets || 0,
      won: Math.round(lottoStats.totalWon || 0),
      wins: lottoStats.wins || 0,
    },
    scratch: {
      tickets: scratchStats.totalTickets || 0,
      spent: Math.round(scratchStats.totalSpent || 0),
      won: Math.round(scratchStats.totalWon || 0),
      wins: scratchStats.wins || 0,
    },
    racing: {
      bets: racingStats.totalBets || 0,
      betAmount: Math.round(racingStats.totalBetAmount || 0),
      won: Math.round(racingStats.totalWon || 0),
      wins: racingStats.wins || 0,
    },
    fleet: {
      hasFleet: fleets.length > 0,
      count: fleets.length,
    },
    market: {
      purchases: marketStats.totalPurchases || 0,
      spent: Math.round(marketStats.totalSpent || 0),
    },
    convoy: {
      interested: convoyInterested,
      joined: convoyJoined,
    },
    achievements: {
      total: achievementStats.totalAchievements || 0,
    },
    gallery: {
      posts: galleryPosts.totalPosts || 0,
      comments: galleryComments.totalComments || 0,
    }
  };
}
