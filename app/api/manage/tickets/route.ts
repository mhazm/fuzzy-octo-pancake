import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import Ticket from "@/lib/models/Ticket";
import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "15")));
    const status = searchParams.get("status") || "all";
    const managerId = searchParams.get("managerId") || "all";
    const selectedMonth = searchParams.get("month") || "all";

    const discordId = session.user.discordId;

    // Build Date Range if month is specified
    let dateFilter: any = null;
    if (selectedMonth && selectedMonth !== "all" && /^\d{4}-\d{2}$/.test(selectedMonth)) {
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr);
      const monthIndex = parseInt(monthStr) - 1; // 0-indexed

      // Create start and end in Asia/Jakarta timezone equivalent (-7 UTC)
      const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
      startOfMonth.setUTCHours(startOfMonth.getUTCHours() - 7);

      const endOfMonth = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
      endOfMonth.setUTCHours(endOfMonth.getUTCHours() - 7);

      dateFilter = { $gte: startOfMonth, $lt: endOfMonth };
    }

    // Filter for paginated tickets
    const ticketQuery: any = {};
    if (status !== "all") {
      ticketQuery.status = status;
    }
    if (managerId !== "all") {
      ticketQuery.managerId = managerId;
    }
    if (dateFilter) {
      ticketQuery.createdAt = dateFilter;
    }

    const totalTickets = await Ticket.countDocuments(ticketQuery);
    const totalPages = Math.max(1, Math.ceil(totalTickets / limit));
    const safePage = Math.min(page, totalPages);

    const tickets = await Ticket.find(ticketQuery)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean();

    // 1. Period-Specific Global Stats
    const periodGlobalMatch = dateFilter ? { createdAt: dateFilter } : {};
    const periodGlobalStatsRaw = await Ticket.aggregate([
      { $match: periodGlobalMatch },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
          claimed: { $sum: { $cond: [{ $eq: ["$status", "claimed"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
    ]);
    const periodGlobal = periodGlobalStatsRaw[0] || {
      total: 0,
      open: 0,
      claimed: 0,
      resolved: 0,
      rejected: 0,
    };

    // 2. Period-Specific Personal Stats for current manager (including Rating & Tips)
    const periodPersonalMatch: any = { managerId: discordId };
    if (dateFilter) {
      periodPersonalMatch.createdAt = dateFilter;
    }
    const periodPersonalStatsRaw = await Ticket.aggregate([
      { $match: periodPersonalMatch },
      {
        $group: {
          _id: null,
          totalHandled: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          claimed: { $sum: { $cond: [{ $eq: ["$status", "claimed"] }, 1, 0] } },
          totalRating: { $sum: "$rating" },
          ratedCount: { $sum: { $cond: [{ $gt: ["$rating", 0] }, 1, 0] } },
          totalTips: { $sum: "$tipAmount" },
        },
      },
    ]);
    const periodPersonal = periodPersonalStatsRaw[0] || {
      totalHandled: 0,
      resolved: 0,
      rejected: 0,
      claimed: 0,
      totalRating: 0,
      ratedCount: 0,
      totalTips: 0,
    };

    const personalAvgRating =
      periodPersonal.ratedCount > 0
        ? (periodPersonal.totalRating / periodPersonal.ratedCount).toFixed(1)
        : "0.0";

    // 3. All-Time Global Stats
    const allTimeGlobalRaw = await Ticket.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
          claimed: { $sum: { $cond: [{ $eq: ["$status", "claimed"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
    ]);
    const allTimeGlobal = allTimeGlobalRaw[0] || {
      total: 0,
      open: 0,
      claimed: 0,
      resolved: 0,
      rejected: 0,
    };

    // 4. All-Time Personal Stats
    const allTimePersonalRaw = await Ticket.aggregate([
      { $match: { managerId: discordId } },
      {
        $group: {
          _id: null,
          totalHandled: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          totalRating: { $sum: "$rating" },
          ratedCount: { $sum: { $cond: [{ $gt: ["$rating", 0] }, 1, 0] } },
          totalTips: { $sum: "$tipAmount" },
        },
      },
    ]);
    const allTimePersonal = allTimePersonalRaw[0] || {
      totalHandled: 0,
      resolved: 0,
      rejected: 0,
      totalRating: 0,
      ratedCount: 0,
      totalTips: 0,
    };

    const allTimeAvgRating =
      allTimePersonal.ratedCount > 0
        ? (allTimePersonal.totalRating / allTimePersonal.ratedCount).toFixed(1)
        : "0.0";

    // 5. Staff Performance Leaderboard in Selected Period (including Rating, Tips & Activity)
    const staffMatch: any = { managerId: { $ne: null, $exists: true } };
    if (dateFilter) {
      staffMatch.createdAt = dateFilter;
    }

    const staffLeaderboardRaw = await Ticket.aggregate([
      { $match: staffMatch },
      {
        $group: {
          _id: "$managerId",
          totalHandled: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
          claimed: { $sum: { $cond: [{ $eq: ["$status", "claimed"] }, 1, 0] } },
          totalRating: { $sum: "$rating" },
          ratedCount: { $sum: { $cond: [{ $gt: ["$rating", 0] }, 1, 0] } },
          totalTips: { $sum: "$tipAmount" },
          latestHandledAt: { $max: "$updatedAt" },
        },
      },
      { $sort: { totalHandled: -1, resolved: -1 } },
    ]);

    // 6. Distinct Months Available in Database
    const distinctMonthsRaw = await Ticket.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
              timezone: "Asia/Jakarta",
            },
          },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const nowWib = new Date();
    const currentYearMonth = `${nowWib.getFullYear()}-${String(
      nowWib.getMonth() + 1
    ).padStart(2, "0")}`;

    const rawMonthKeys = Array.from(
      new Set([
        currentYearMonth,
        ...distinctMonthsRaw.map((m) => m._id).filter(Boolean),
      ])
    ).sort((a, b) => b.localeCompare(a));

    const availableMonths = rawMonthKeys.map((key) => {
      const [y, m] = key.split("-");
      const monthIdx = parseInt(m) - 1;
      return {
        value: key,
        label: `${MONTH_NAMES[monthIdx] || m} ${y}`,
        isCurrent: key === currentYearMonth,
      };
    });

    // 7. Enrich Users & Staff Data
    const client = await clientPromise;
    const db = client.db();

    const allDiscordIds = Array.from(
      new Set([
        ...tickets.map((t: any) => t.discordId),
        ...tickets.map((t: any) => t.managerId).filter(Boolean),
        ...staffLeaderboardRaw.map((s: any) => s._id),
      ])
    );

    const users = await db
      .collection("users")
      .find(
        { discordId: { $in: allDiscordIds } },
        { projection: { discordId: 1, name: 1, image: 1, truckyId: 1, truckyRank: 1, role: 1 } }
      )
      .toArray();

    const userMap: Record<string, any> = users.reduce((acc: any, u) => {
      acc[u.discordId] = {
        name: u.name,
        image: u.image,
        truckyId: u.truckyId,
        truckyRank: u.truckyRank,
        role: u.role,
      };
      return acc;
    }, {});

    const enrichedTickets = tickets.map((t: any) => ({
      ...t,
      creatorInfo: userMap[t.discordId] || { name: t.discordId, image: null },
      managerInfo: t.managerId ? userMap[t.managerId] || { name: t.managerId, image: null } : null,
    }));

    const staffLeaderboard = staffLeaderboardRaw.map((s: any, index: number) => {
      const u = userMap[s._id] || {};
      const handled = s.totalHandled || 0;
      const resolved = s.resolved || 0;
      const resolutionRate = handled > 0 ? Math.round((resolved / handled) * 100) : 0;
      const ncEarned = (s.resolved + s.rejected) * 500;
      const avgRating =
        s.ratedCount > 0 ? (s.totalRating / s.ratedCount).toFixed(1) : "0.0";

      return {
        rank: index + 1,
        managerId: s._id,
        name: u.name || s._id,
        image: u.image || null,
        truckyId: u.truckyId || null,
        truckyRank: u.truckyRank || null,
        totalHandled: handled,
        resolved,
        rejected: s.rejected || 0,
        claimed: s.claimed || 0,
        resolutionRate,
        ncEarned,
        avgRating,
        ratedCount: s.ratedCount || 0,
        totalTips: s.totalTips || 0,
        latestHandledAt: s.latestHandledAt || null,
      };
    });

    const allManagerIds = await Ticket.distinct("managerId", {
      managerId: { $ne: null, $exists: true },
    });
    const staffList = allManagerIds.map((id: string) => {
      const u = userMap[id];
      return { id, name: u ? u.name : id };
    });

    return NextResponse.json({
      success: true,
      tickets: enrichedTickets,
      selectedMonth,
      availableMonths,
      stats: {
        totalHandled: periodPersonal.totalHandled,
        resolved: periodPersonal.resolved,
        rejected: periodPersonal.rejected,
        claimed: periodPersonal.claimed,
        ncEarned: (periodPersonal.resolved + periodPersonal.rejected) * 500,
        resolutionRate:
          periodPersonal.totalHandled > 0
            ? Math.round(
                (periodPersonal.resolved / periodPersonal.totalHandled) * 100
              )
            : 0,
        avgRating: personalAvgRating,
        ratedCount: periodPersonal.ratedCount,
        totalTips: periodPersonal.totalTips,
      },
      globalStats: {
        totalTickets: periodGlobal.total,
        unhandled: periodGlobal.open,
        claimed: periodGlobal.claimed,
        handled: periodGlobal.total - periodGlobal.open,
        resolved: periodGlobal.resolved,
        rejected: periodGlobal.rejected,
      },
      allTimeStats: {
        personal: {
          totalHandled: allTimePersonal.totalHandled,
          resolved: allTimePersonal.resolved,
          rejected: allTimePersonal.rejected,
          ncEarned: (allTimePersonal.resolved + allTimePersonal.rejected) * 500,
          avgRating: allTimeAvgRating,
          ratedCount: allTimePersonal.ratedCount,
          totalTips: allTimePersonal.totalTips,
        },
        global: {
          totalTickets: allTimeGlobal.total,
          unhandled: allTimeGlobal.open,
          claimed: allTimeGlobal.claimed,
          resolved: allTimeGlobal.resolved,
          rejected: allTimeGlobal.rejected,
        },
      },
      staffLeaderboard,
      staffList,
      pagination: {
        currentPage: safePage,
        totalPages,
        totalTickets,
        limit,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Manage Tickets GET Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pada server tiket." },
      { status: 500 }
    );
  }
}
