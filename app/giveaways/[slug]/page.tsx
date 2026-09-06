import React from "react";
import clientPromise from "@/lib/mongodb";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import GiveawayPublicDetailClient from "./GiveawayPublicDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = await clientPromise;
  const db = client.db();

  const giveaway = await db.collection("giveaways").findOne({ slug });
  if (!giveaway) {
    return { title: "Giveaway Tidak Ditemukan" };
  }

  const title = `${giveaway.title}`;
  const description = giveaway.description || "Event giveaway resmi Nismara Transport.";
  const banner = giveaway.bannerUrl || "https://images.nismara.my.id/227300_188.jpg";
  const pageUrl = `https://transport.nismara.web.id/giveaways/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Nismara Transport",
      locale: "id_ID",
      type: "website",
      images: [
        {
          url: banner,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [banner],
    },
  };
}

export default async function GiveawayPublicDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await clientPromise;
  const db = client.db();

  const giveawayDoc = await db.collection("giveaways").findOne({ slug });
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
    winners: giveawayDoc.winners || [],
    stats: giveawayDoc.stats || { totalTickets: 0, totalParticipants: 0, totalNcBurned: 0 },
  };

  return <GiveawayPublicDetailClient giveaway={serialized} />;
}
