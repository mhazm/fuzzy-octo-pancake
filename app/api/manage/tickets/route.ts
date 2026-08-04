import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import Ticket from "@/lib/models/Ticket";

import dbConnect from "@/lib/mongoose";
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "manager") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const discordId = session.user.discordId;

    const allTickets = await Ticket.find().sort({ createdAt: -1 }).lean();

    const allDiscordIds = Array.from(new Set([
      ...allTickets.map((t: any) => t.discordId),
      ...allTickets.map((t: any) => t.managerId).filter(Boolean)
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

    const enrichedTickets = allTickets.map((t: any) => ({
      ...t,
      creatorInfo: userMap[t.discordId] || { name: t.discordId, image: null },
      managerInfo: t.managerId ? (userMap[t.managerId] || { name: t.managerId, image: null }) : null
    }));

    const stats = {
      totalHandled: enrichedTickets.filter((t: any) => t.managerId === discordId).length,
      resolved: enrichedTickets.filter((t: any) => t.managerId === discordId && t.status === "resolved").length,
      rejected: enrichedTickets.filter((t: any) => t.managerId === discordId && t.status === "rejected").length,
    };

    const globalStats = {
      totalTickets: enrichedTickets.length,
      unhandled: enrichedTickets.filter((t: any) => t.status === "open").length,
      handled: enrichedTickets.filter((t: any) => t.status !== "open").length,
      resolved: enrichedTickets.filter((t: any) => t.status === "resolved").length,
      rejected: enrichedTickets.filter((t: any) => t.status === "rejected").length,
    };

    const staffList = Array.from(new Set(enrichedTickets.map((t: any) => t.managerId).filter(Boolean)))
      .map((id) => {
        const info = userMap[id as string];
        return {
          id,
          name: info ? info.name : id
        };
      });

    return NextResponse.json({ success: true, tickets: enrichedTickets, stats, globalStats, staffList });
  } catch (error) {
    console.error("Manage Tickets GET Error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan internal" }, { status: 500 });
  }
}
