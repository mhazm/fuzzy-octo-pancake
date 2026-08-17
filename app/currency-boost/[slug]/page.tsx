import clientPromise from "@/lib/mongodb";
import BoostDetailClient from "./BoostDetailClient";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const client = await clientPromise;
  const db = client.db();
  const event = await db
    .collection("ncevents")
    .findOne({ slug: resolvedParams.slug });
  if (!event) return { title: "Event Not Found" };
  
  const metadata: Metadata = {
    title: `${event.nameEvent}`,
    description: `Ikuti event ${event.nameEvent} dan dapatkan bonus multiplier sebesar ${event.multiplier}x!`,
  };

  if (event.imageUrl) {
    metadata.openGraph = {
      images: [event.imageUrl],
    };
    metadata.twitter = {
      card: "summary_large_image",
      images: [event.imageUrl],
    };
  }

  return metadata;
}

export default async function CurrencyBoostDetailPage({ params }: any) {
  const resolvedParams = await params;
  const client = await clientPromise;
  const db = client.db();
  const event = await db
    .collection("ncevents")
    .findOne({ slug: resolvedParams.slug });

  if (!event) {
    notFound();
  }

  const participants = event.participants || [];
  const participantIds = participants.map((p: any) => p.discordId);

  // Ambil detail user untuk participants
  const users = await db
    .collection("users")
    .find({ discordId: { $in: participantIds } })
    .toArray();

  const enrichedParticipants = participants.map((p: any) => {
    const user = users.find((u) => u.discordId === p.discordId);
    return {
      ...p,
      name: user?.name || "Unknown Driver",
      avatarUrl: user?.image || "https://i.imgur.com/6M5rN9n.png",
      truckyId: user?.truckyId,
      truckyRank: user?.truckyRank,
      role: user?.discordRole || user?.role,
      isBooster: user?.isBooster,
      isNismaraPlus: user?.nismaraplus?.status === true,
      nismaraPlusStartedAt: user?.nismaraplus?.startedAt,
    };
  });

  const serializedEvent = {
    _id: event._id.toString(),
    slug: event.slug,
    nameEvent: event.nameEvent,
    multiplier: event.multiplier,
    imageUrl: event.imageUrl,
    type: event.type,
    gameId: event.gameId,
    isActive: event.isActive,
    endAt:
      event.realEndAt || event.endAt
        ? (event.realEndAt || event.endAt).toISOString()
        : null,
    setAt: event.setAt ? event.setAt.toISOString() : null,
    setBy: event.setBy,
    participants: enrichedParticipants
      .map((p: any) => ({
        discordId: p.discordId,
        totalEarned: p.totalEarned,
        joinedAt: p.joinedAt ? p.joinedAt.toISOString() : null,
        name: p.name,
        avatarUrl: p.avatarUrl,
        truckyId: p.truckyId,
        truckyRank: p.truckyRank,
        role: p.role,
        isBooster: p.isBooster,
        isNismaraPlus: p.isNismaraPlus,
        nismaraPlusStartedAt: p.nismaraPlusStartedAt,
      }))
      .sort((a: any, b: any) => b.totalEarned - a.totalEarned),
  };

  return <BoostDetailClient event={serializedEvent} />;
}
