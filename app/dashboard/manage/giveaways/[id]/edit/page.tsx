import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect, notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import GiveawayFormClient from "../../GiveawayFormClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Edit Giveaway",
};

export default async function EditGiveawayPage({
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

  const serialized = {
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
    quests: giveawayDoc.quests || [],
    enableNcPurchase: Boolean(giveawayDoc.enableNcPurchase),
    ticketPriceNC: giveawayDoc.ticketPriceNC || 1000,
    maxPurchasableTickets: giveawayDoc.maxPurchasableTickets ?? 5,
    prizes: giveawayDoc.prizes || [],
  };

  return <GiveawayFormClient isEdit={true} initialData={serialized} />;
}
