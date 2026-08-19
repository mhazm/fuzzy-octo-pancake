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

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const status = searchParams.get("status") || "all";
    const managerId = searchParams.get("managerId") || "all";

    const discordId = session.user.discordId;

    // Build filter query for paginated tickets
    const filter: any = {};
    if (status !== "all") {
      filter.status = status;
    }
    if (managerId !== "all") {
      filter.managerId = managerId;
    }

    // Get total count for pagination (with filters)
    const totalTickets = await Ticket.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalTickets / limit));
    const safePage = Math.min(page, totalPages);

    // Fetch only the tickets for the current page
    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean();

    // Stats are computed from ALL tickets (unfiltered) 
    const allTicketStatsGlobal = await Ticket.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
    ]);

    const gStats = allTicketStatsGlobal[0] || { total: 0, open: 0, resolved: 0, rejected: 0 };

    // Personal stats for the current manager
    const personalStatsRaw = await Ticket.aggregate([
      { $match: { managerId: discordId } },
      {
        $group: {
          _id: null,
          totalHandled: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
    ]);

    const pStats = personalStatsRaw[0] || { totalHandled: 0, resolved: 0, rejected: 0 };

    // Enrich tickets with user info
    const allDiscordIds = Array.from(new Set([
      ...tickets.map((t: any) => t.discordId),
      ...tickets.map((t: any) => t.managerId).filter(Boolean)
    ]));

    const client = await clientPromise;
    const db = client.db();
    const users = await db.collection("users").find(
      { discordId: { $in: allDiscordIds } },
      { projection: { discordId: 1, name: 1, image: 1 } }
    ).toArray();

    const userMap: any = users.reduce((acc: any, u) => {
      acc[u.discordId] = { name: u.name, image: u.image };
      return acc;
    }, {});

    const enrichedTickets = tickets.map((t: any) => ({
      ...t,
      creatorInfo: userMap[t.discordId] || { name: t.discordId, image: null },
      managerInfo: t.managerId ? (userMap[t.managerId] || { name: t.managerId, image: null }) : null
    }));

    const stats = {
      totalHandled: pStats.totalHandled,
      resolved: pStats.resolved,
      rejected: pStats.rejected,
    };

    const globalStats = {
      totalTickets: gStats.total,
      unhandled: gStats.open,
      handled: gStats.total - gStats.open,
      resolved: gStats.resolved,
      rejected: gStats.rejected,
    };

    // Build staff list from ALL tickets with managers
    const allManagerIds = await Ticket.distinct("managerId", { managerId: { $ne: null, $exists: true } });
    const staffUsers = allManagerIds.length > 0
      ? await db.collection("users").find(
          { discordId: { $in: allManagerIds } },
          { projection: { discordId: 1, name: 1 } }
        ).toArray()
      : [];

    const staffList = allManagerIds.map((id: string) => {
      const info = staffUsers.find((u: any) => u.discordId === id);
      return { id, name: info ? info.name : id };
    });

    return NextResponse.json({
      success: true,
      tickets: enrichedTickets,
      stats,
      globalStats,
      staffList,
      pagination: {
        currentPage: safePage,
        totalPages,
        totalTickets,
        limit,
      },
    });
  } catch (error) {
    console.error("Manage Tickets GET Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
