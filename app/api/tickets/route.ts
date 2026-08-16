import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import Ticket from "@/lib/models/Ticket";

export const dynamic = "force-dynamic";

import dbConnect from "@/lib/mongoose";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CATEGORY_ID =
  process.env.DISCORD_TICKET_CATEGORY_ID ||
  process.env.DISCORD_PLUS_CATEGORY_ID;
const MANAGER_ROLE_ID = process.env.DISCORD_MANAGER_ROLE_ID;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const status = searchParams.get("status") || "all";

    const discordId = session.user.discordId;

    // Build filter query
    const filter: any = { discordId };
    if (status !== "all") {
      filter.status = status;
    }

    // Get total count for pagination (with filter)
    const totalTickets = await Ticket.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalTickets / limit));
    const safePage = Math.min(page, totalPages);

    // Fetch only the tickets for the current page
    const tickets = await Ticket.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * limit)
      .limit(limit)
      .lean();

    // Stats are computed from ALL user tickets (unfiltered)
    const allTicketStats = await Ticket.aggregate([
      { $match: { discordId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
    ]);

    const statsData = allTicketStats[0] || { total: 0, resolved: 0, rejected: 0 };

    const allDiscordIds = Array.from(
      new Set([
        ...tickets.map((t: any) => t.discordId),
        ...tickets.map((t: any) => t.managerId).filter(Boolean),
      ]),
    );

    const client = await clientPromise;
    const db = client.db();
    const users = await db
      .collection("users")
      .find(
        { discordId: { $in: allDiscordIds } },
        { projection: { discordId: 1, name: 1, image: 1 } },
      )
      .toArray();

    const userMap: any = users.reduce((acc: any, u) => {
      acc[u.discordId] = { name: u.name, image: u.image };
      return acc;
    }, {});

    const managerIds = Array.from(
      new Set(tickets.map((t: any) => t.managerId).filter(Boolean)),
    );
    const managerStatsRaw = await Ticket.aggregate([
      {
        $match: {
          managerId: { $in: managerIds },
          status: { $in: ["resolved", "rejected"] },
        },
      },
      {
        $group: {
          _id: "$managerId",
          totalHandled: { $sum: 1 },
          totalRating: { $sum: "$rating" },
          ratedCount: { $sum: { $cond: [{ $gt: ["$rating", 0] }, 1, 0] } },
        },
      },
    ]);

    const managerStatsMap: any = {};
    managerStatsRaw.forEach((m) => {
      managerStatsMap[m._id] = {
        totalHandled: m.totalHandled,
        avgRating:
          m.ratedCount > 0 ? (m.totalRating / m.ratedCount).toFixed(1) : "0.0",
      };
    });

    const enrichedTickets = tickets.map((t: any) => ({
      ...t,
      creatorInfo: userMap[t.discordId] || { name: t.discordId, image: null },
      managerInfo: t.managerId
        ? {
            ...(userMap[t.managerId] || { name: t.managerId, image: null }),
            stats: managerStatsMap[t.managerId] || {
              totalHandled: 0,
              avgRating: "0.0",
            },
          }
        : null,
    }));

    const stats = {
      opened: statsData.total,
      resolved: statsData.resolved,
      rejected: statsData.rejected,
    };

    return NextResponse.json({
      success: true,
      tickets: enrichedTickets,
      stats,
      discordGuildId: GUILD_ID,
      pagination: {
        currentPage: safePage,
        totalPages,
        totalTickets,
        limit,
      },
    });
  } catch (error) {
    console.error("Tickets GET Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { categoryId, categoryName, subject, description } =
      await request.json();
    if (!categoryId || !categoryName || !subject || !description) {
      return NextResponse.json(
        { error: "Semua field harus diisi" },
        { status: 400 },
      );
    }

    await dbConnect();

    const client = await clientPromise;
    const db = client.db();
    const user = await db
      .collection("users")
      .findOne({ discordId: session.user.discordId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ticketId = `TICKET-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Hitung jumlah tiket di kategori ini untuk mendapatkan nomor urut
    const ticketCount = await db
      .collection("tickets")
      .countDocuments({ categoryId });
    const nextTicketNumber = ticketCount + 1;

    // Format nama channel: kategori-username-nomor
    const safeCategory = categoryName
      .replace(/[^a-zA-Z0-9]/g, "-")
      .toLowerCase();
    const safeUsername = user.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const channelName =
      `🎫|${safeCategory}-${safeUsername}-${nextTicketNumber}`.substring(
        0,
        100,
      ); // Batasi max 100 karakter untuk Discord

    // 1. Create Discord Channel
    const createChannelRes = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: channelName,
          type: 0, // GUILD_TEXT
          parent_id: CATEGORY_ID,
          permission_overwrites: [
            {
              id: GUILD_ID, // @everyone role
              type: 0, // role
              deny: "1024", // VIEW_CHANNEL
            },
            {
              id: user.discordId,
              type: 1, // member
              allow: "68608", // VIEW_CHANNEL + SEND_MESSAGES + READ_MESSAGE_HISTORY
            },
            {
              id: MANAGER_ROLE_ID,
              type: 0, // role
              allow: "68608",
            },
          ],
        }),
      },
    );

    if (!createChannelRes.ok) {
      const err = await createChannelRes.text();
      console.error("Discord API Error (Create Ticket Channel):", err);
      return NextResponse.json(
        { error: "Gagal membuat tiket di Discord" },
        { status: 500 },
      );
    }

    const channelData = await createChannelRes.json();
    const discordChannelId = channelData.id;

    // 2. Post initial message
    await fetch(
      `https://discord.com/api/v10/channels/${discordChannelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: `<@${user.discordId}> tiket Anda berhasil dibuat! Mohon tunggu <@&${MANAGER_ROLE_ID}> merespon.`,
          embeds: [
            {
              title: `🎫 Tiket Baru: ${ticketId}`,
              color: 0x3b82f6,
              fields: [
                { name: "Kategori", value: categoryName, inline: true },
                { name: "Subjek", value: subject, inline: true },
                { name: "Deskripsi", value: description, inline: false },
              ],
            },
          ],
        }),
      },
    );

    // 3. Save to DB
    const newTicket = await Ticket.create({
      ticketId,
      userId: String(user._id),
      discordId: user.discordId,
      discordChannelId,
      categoryId,
      categoryName,
      subject,
      description,
      status: "open",
    });

    return NextResponse.json({ success: true, ticket: newTicket });
  } catch (error) {
    console.error("Tickets POST Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 },
    );
  }
}
