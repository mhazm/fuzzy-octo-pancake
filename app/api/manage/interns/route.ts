import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import { getCompanyMembersMap } from "@/lib/trucky";

import dbConnect from "@/lib/mongoose";
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const client = await clientPromise;
    const db = client.db();

    // 1. Fetch data Trucky
    const NISMARA_COMPANY_ID = process.env.TRUCKY_COMPANY_ID || "4138";
    const membersMap = await getCompanyMembersMap(Number(NISMARA_COMPANY_ID));

    // 2. Ambil driverlinks
    const driverLinks = await db.collection("driverlinks").find({}).toArray();
    const discordIdsFromLinks = driverLinks.map((d) => d.userId);

    // 3. Ambil data users di DB
    const webUsers = await db.collection("users").find({
      discordId: { $in: discordIdsFromLinks }
    }).toArray();

    // 4. Identifikasi Intern (berdasarkan role Trucky API atau fallback DB)
    const internUsers: any[] = [];
    const internDiscordIds: string[] = [];
    const driverLinkMap: any = {};

    driverLinks.forEach((link) => {
      driverLinkMap[link.userId] = link;
      const webUser = webUsers.find((u) => u.discordId === link.userId);
      const truckyData = membersMap[link.truckyId] || {};

      // Role Check (Prioritaskan dari Trucky API, fallback ke users DB)
      const truckyRoleName = truckyData.role
        ? typeof truckyData.role === "object"
          ? truckyData.role.name
          : truckyData.role
        : null;

      const finalRole = truckyRoleName || webUser?.truckyRole || "";

      if (finalRole.toLowerCase().includes("intern") || finalRole.toLowerCase().includes("magang")) {
        // Gabungkan data user (menggunakan data dari DB jika ada, atau buat dummy object berdasarkan link)
        internUsers.push({
          _id: webUser?._id || new mongoose.Types.ObjectId(),
          discordId: link.userId,
          name: webUser?.name || link.truckyName || truckyData.username || "Unknown Driver",
          image: webUser?.image || webUser?.avatarUrl || truckyData.avatar_url || "https://cdn.truckyapp.com/public/default-avatar.png",
          truckyId: link.truckyId,
          truckyRole: finalRole,
          truckyRank: webUser?.truckyRank || "Member",
          xp: webUser?.xp || 0,
          level: webUser?.level || 1,
          isOnLeave: webUser?.isOnLeave || false,
          isBooster: webUser?.isBooster || false,
          nismaraplus: webUser?.nismaraplus || { status: false },
          createdAt: webUser?.createdAt || link.createdAt,
        });
        internDiscordIds.push(link.userId);
      }
    });

    if (internUsers.length === 0) {
      return NextResponse.json({ success: true, interns: [] });
    }

    const discordIds = internDiscordIds;

    // Ambil data pekerjaan (JobHistory)
    const jobStats = await db.collection("jobhistories").aggregate([
      { $match: { driverId: { $in: discordIds }, jobStatus: "COMPLETED" } },
      {
        $group: {
          _id: "$driverId",
          totalJobs: { $sum: 1 },
          totalNcEarned: { $sum: "$nc.total" },
          totalNcCost: { $sum: "$ncCost.total" },
          totalDistanceKm: { $sum: "$distanceKm" },
          totalXpEarned: { $sum: "$xp.total" },
          totalPenalty: { $sum: "$penalty.total" },
          specialContractJobs: { $sum: { $cond: ["$isSpecialContract", 1, 0] } },
          specialContractIncome: { $sum: { $cond: ["$isSpecialContract", "$nc.total", 0] } },
          hardcoreJobs: { $sum: { $cond: ["$isHardcore", 1, 0] } },
          hardcoreRatingSum: { $sum: { $cond: ["$isHardcore", "$hardcoreRating", 0] } },
        }
      }
    ]).toArray();

    const jobMap: any = {};
    jobStats.forEach(s => { jobMap[s._id] = s; });

    // Lotto
    const lottoStats = await db.collection("lottotickets").aggregate([
      { $match: { discordId: { $in: discordIds } } },
      {
        $group: {
          _id: "$discordId",
          totalTickets: { $sum: 1 },
          totalWon: { $sum: "$prizeWon" },
          wins: { $sum: { $cond: [{ $in: ["$status", ["WIN_TIER_1", "WIN_TIER_2", "WIN_TIER_3"]] }, 1, 0] } },
        }
      }
    ]).toArray();

    const lottoMap: any = {};
    lottoStats.forEach(s => { lottoMap[s._id] = s; });

    // Scratch
    const scratchStats = await db.collection("scratchtickets").aggregate([
      { $match: { discordId: { $in: discordIds } } },
      {
        $group: {
          _id: "$discordId",
          totalTickets: { $sum: 1 },
          totalSpent: { $sum: "$price" },
          totalWon: { $sum: "$prizeWon" },
          wins: { $sum: { $cond: ["$isWinning", 1, 0] } },
        }
      }
    ]).toArray();

    const scratchMap: any = {};
    scratchStats.forEach(s => { scratchMap[s._id] = s; });

    // Racing
    const racingStats = await db.collection("racingtickets").aggregate([
      { $match: { discordId: { $in: discordIds } } },
      {
        $group: {
          _id: "$discordId",
          totalBets: { $sum: 1 },
          totalBetAmount: { $sum: "$betAmount" },
          totalWon: { $sum: "$prizeWon" },
          wins: { $sum: { $cond: ["$isWinning", 1, 0] } },
        }
      }
    ]).toArray();

    const racingMap: any = {};
    racingStats.forEach(s => { racingMap[s._id] = s; });

    // Fleet Ownership
    const Fleet = mongoose.models.Fleet || require("@/lib/models/Fleet").default;
    // Karena beberapa intern mungkin belum login dan tidak punya user _id yang valid, 
    // kita hanya query menggunakan _id yang sudah ada di database (bukan yang di-generate via mongoose).
    // Kita convert ke string agar mongoose tidak clash bson version dengan native mongodb driver.
    const validUserIds = internUsers
      .filter(u => u._id && u.createdAt)
      .map(u => u._id.toString());
      
    const fleets = validUserIds.length > 0 
      ? await Fleet.find({ owner: { $in: validUserIds } }).lean()
      : [];

    const fleetMap: any = {};
    fleets.forEach((f: any) => {
      const owner = f.owner?.toString();
      if (!fleetMap[owner]) fleetMap[owner] = [];
      fleetMap[owner].push(f);
    });

    // Hapus query driverlinks yang duplikat karena sudah diambil di atas

    // Market purchases
    const purchases = await db.collection("marketpurchases").aggregate([
      { $match: { buyerId: { $in: discordIds } } },
      { $group: { _id: "$buyerId", totalPurchases: { $sum: 1 }, totalSpent: { $sum: "$pricePaid" } } }
    ]).toArray();

    const purchaseMap: any = {};
    purchases.forEach(p => { purchaseMap[p._id] = p; });

    // Tickets
    const ticketStats = await db.collection("tickets").aggregate([
      { $match: { discordId: { $in: discordIds } } },
      { $group: { _id: "$discordId", totalTickets: { $sum: 1 } } }
    ]).toArray();

    const ticketMap: any = {};
    ticketStats.forEach(t => { ticketMap[t._id] = t; });

    // Validated Jobs
    const validatedStats = await db.collection("validatedjobs").aggregate([
      { $match: { discordId: { $in: discordIds } } },
      { $group: { _id: "$discordId", totalValidated: { $sum: 1 } } }
    ]).toArray();

    const validatedMap: any = {};
    validatedStats.forEach(v => { validatedMap[v._id] = v; });

    // Quiz Attempts
    const quizStats = await db.collection("quizattempts").find({ discordId: { $in: discordIds } }).sort({ createdAt: -1 }).toArray();
    const quizMap: any = {};
    // Because it's sorted by latest first, the first one we see is the latest attempt
    quizStats.forEach(q => {
      if (!quizMap[q.discordId]) {
        quizMap[q.discordId] = {
          latestScore: q.score,
          passed: q.passed,
          attemptCount: 1
        };
      } else {
        quizMap[q.discordId].attemptCount += 1;
      }
    });

    // Convoy (Interested vs Joined)
    // - interested array contains discordIds
    // - partisipan array contains { discordId }
    const convoys = await db.collection("convoylobbies").find({
      $or: [
        { interested: { $in: discordIds } },
        { "partisipan.discordId": { $in: discordIds } }
      ]
    }).toArray();

    const convoyMap: any = {};
    discordIds.forEach(id => {
      convoyMap[id] = { interested: 0, joined: 0 };
    });
    convoys.forEach(c => {
      c.interested?.forEach((id: string) => {
        if (convoyMap[id]) convoyMap[id].interested += 1;
      });
      c.partisipan?.forEach((p: any) => {
        if (p.discordId && convoyMap[p.discordId]) convoyMap[p.discordId].joined += 1;
      });
    });

    // User Achievements
    const achievementStats = await db.collection("userachievements").aggregate([
      { $match: { discordId: { $in: discordIds } } },
      { $group: { _id: "$discordId", totalAchievements: { $sum: 1 } } }
    ]).toArray();

    const achievementMap: any = {};
    achievementStats.forEach(a => { achievementMap[a._id] = a; });

    // Build intern data
    const interns = internUsers.map(user => {
      const did = user.discordId;
      const jobs = jobMap[did] || {};
      const lotto = lottoMap[did] || {};
      const scratch = scratchMap[did] || {};
      const racing = racingMap[did] || {};
      const purchase = purchaseMap[did] || {};
      const ticket = ticketMap[did] || {};
      const validated = validatedMap[did] || {};
      const convoy = convoyMap[did] || { interested: 0, joined: 0 };
      const achievement = achievementMap[did] || {};
      const quiz = quizMap[did] || null;
      const userFleets = fleetMap[user._id?.toString()] || [];
      const driverLink = driverLinkMap[did];

      const joinedAt = driverLink?.createdAt || user.createdAt;
      const daysSinceJoin = joinedAt ? Math.floor((Date.now() - new Date(joinedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        _id: user._id,
        discordId: did,
        name: user.name,
        image: user.image,
        truckyId: user.truckyId,
        truckyRole: user.truckyRole,
        truckyRank: user.truckyRank,
        xp: user.xp || 0,
        level: user.level || 1,
        joinedAt,
        daysSinceJoin,
        isOnLeave: user.isOnLeave || false,
        isBooster: user.isBooster || false,
        nismaraPlus: user.nismaraplus?.status || false,

        jobs: {
          total: jobs.totalJobs || 0,
          ncEarned: Math.round(jobs.totalNcEarned || 0),
          ncCost: Math.round(jobs.totalNcCost || 0),
          netIncome: Math.round((jobs.totalNcEarned || 0) - (jobs.totalNcCost || 0)),
          distanceKm: Math.round(jobs.totalDistanceKm || 0),
          xpEarned: Math.round(jobs.totalXpEarned || 0),
          totalPenalty: Math.round(jobs.totalPenalty || 0),
          specialContractJobs: jobs.specialContractJobs || 0,
          specialContractIncome: Math.round(jobs.specialContractIncome || 0),
          hardcoreJobs: jobs.hardcoreJobs || 0,
          hardcoreRatingAvg: jobs.hardcoreJobs ? (jobs.hardcoreRatingSum / jobs.hardcoreJobs).toFixed(1) : "0",
          validatedJobs: validated.totalValidated || 0,
        },

        lotto: {
          tickets: lotto.totalTickets || 0,
          won: Math.round(lotto.totalWon || 0),
          wins: lotto.wins || 0,
        },

        scratch: {
          tickets: scratch.totalTickets || 0,
          spent: Math.round(scratch.totalSpent || 0),
          won: Math.round(scratch.totalWon || 0),
          wins: scratch.wins || 0,
        },

        racing: {
          bets: racing.totalBets || 0,
          betAmount: Math.round(racing.totalBetAmount || 0),
          won: Math.round(racing.totalWon || 0),
          wins: racing.wins || 0,
        },

        fleet: {
          hasFleet: userFleets.length > 0,
          count: userFleets.length,
        },

        market: {
          purchases: purchase.totalPurchases || 0,
          spent: Math.round(purchase.totalSpent || 0),
        },

        tickets: {
          total: ticket.totalTickets || 0,
        },

        convoy: {
          interested: convoy.interested || 0,
          joined: convoy.joined || 0,
        },

        achievements: {
          total: achievement.totalAchievements || 0,
        },

        quiz: quiz,
      };
    });

    // Sort by daysSinceJoin descending (longest first)
    interns.sort((a: any, b: any) => b.daysSinceJoin - a.daysSinceJoin);

    return NextResponse.json({ success: true, interns });
  } catch (error) {
    console.error("GET Intern Monitor Error:", error);
    return NextResponse.json({ error: "Gagal mengambil data intern" }, { status: 500 });
  }
}
