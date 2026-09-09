import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import ManageGiveawaysClient from "./ManageGiveawaysClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Manajemen Giveaway",
};

export default async function ManageGiveawaysPage() {
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

  const client = await clientPromise;
  const db = client.db();

  const rawGiveaways = await db
    .collection("giveaways")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  const giveaways = rawGiveaways.map((g) => ({
    _id: g._id.toString(),
    title: g.title,
    slug: g.slug,
    description: g.description,
    bannerUrl: g.bannerUrl,
    startDate: g.startDate ? new Date(g.startDate).toISOString() : null,
    endDate: g.endDate ? new Date(g.endDate).toISOString() : null,
    drawDate: g.drawDate ? new Date(g.drawDate).toISOString() : null,
    status: g.status || "draft",
    allowMultipleWins: Boolean(g.allowMultipleWins),
    enableQuests: Boolean(g.enableQuests),
    enableNcPurchase: Boolean(g.enableNcPurchase),
    ticketPriceNC: g.ticketPriceNC || 1000,
    maxPurchasableTickets: g.maxPurchasableTickets ?? 5,
    prizes: g.prizes || [],
    winners: g.winners || [],
    stats: g.stats || { totalTickets: 0, totalParticipants: 0, totalNcBurned: 0 },
    createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : null,
  }));

  return <ManageGiveawaysClient initialGiveaways={giveaways} />;
}
