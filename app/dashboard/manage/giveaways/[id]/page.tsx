import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import GiveawayDetailClient from "./GiveawayDetailClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Detail & Undian Giveaway",
};

export default async function ManageGiveawayDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["manager", "admin"].includes(
      (session.user as any).discordRole?.toLowerCase() ||
        session.user.role?.toLowerCase() ||
        ""
    )
  ) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const client = await clientPromise;
  const db = client.db();

  let giveawayDoc = null;
  try {
    giveawayDoc = await db.collection("giveaways").findOne({ _id: new ObjectId(id) });
  } catch (err) {
    notFound();
  }

  if (!giveawayDoc) {
    notFound();
  }

  // Ambil seluruh tiket
  const ticketsDocs = await db
    .collection("giveawaytickets")
    .find({ giveawayId: new ObjectId(id) })
    .sort({ createdAt: -1 })
    .toArray();

  // Enrich user data
  const discordIds = [...new Set(ticketsDocs.map((t) => String(t.discordId)))];
  const users = await db
    .collection("users")
    .find({ discordId: { $in: discordIds } })
    .project({ discordId: 1, name: 1, image: 1 })
    .toArray();

  const userMap = new Map<string, any>();
  users.forEach((u) => userMap.set(String(u.discordId), u));

  const serializedGiveaway = {
    _id: giveawayDoc._id.toString(),
    title: giveawayDoc.title,
    slug: giveawayDoc.slug,
    description: giveawayDoc.description,
    bannerUrl: giveawayDoc.bannerUrl,
    startDate: giveawayDoc.startDate ? new Date(giveawayDoc.startDate).toISOString() : null,
    endDate: giveawayDoc.endDate ? new Date(giveawayDoc.endDate).toISOString() : null,
    drawDate: giveawayDoc.drawDate ? new Date(giveawayDoc.drawDate).toISOString() : null,
    status: giveawayDoc.status,
    allowMultipleWins: Boolean(giveawayDoc.allowMultipleWins),
    enableQuests: Boolean(giveawayDoc.enableQuests),
    enableNcPurchase: Boolean(giveawayDoc.enableNcPurchase),
    ticketPriceNC: giveawayDoc.ticketPriceNC || 1000,
    maxPurchasableTickets: giveawayDoc.maxPurchasableTickets ?? 5,
    prizes: giveawayDoc.prizes || [],
    winners: giveawayDoc.winners || [],
    stats: giveawayDoc.stats || { totalTickets: 0, totalParticipants: 0, totalNcBurned: 0 },
  };

  const serializedTickets = ticketsDocs.map((t) => ({
    _id: t._id.toString(),
    ticketNumber: t.ticketNumber,
    discordId: t.discordId,
    sourceType: t.sourceType,
    costNC: t.costNC || 0,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
    user: userMap.get(String(t.discordId)) || { name: `Driver #${t.discordId.slice(-4)}` },
  }));

  return (
    <GiveawayDetailClient
      giveaway={serializedGiveaway}
      tickets={serializedTickets}
    />
  );
}
