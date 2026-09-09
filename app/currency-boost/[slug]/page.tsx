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
  if (!event) return { title: "Event Tidak Ditemukan" };

  const title = `${event.nameEvent}`;
  const description = `Ikuti event ${event.nameEvent} dan dapatkan bonus multiplier sebesar +${Math.round(Number(event.multiplier || 0) * 100)}% NC!`;
  const imageUrl = event.imageUrl || "https://images.nismara.my.id/227300_188.jpg";
  const pageUrl = `https://transport.nismara.web.id/currency-boost/${resolvedParams.slug}`;

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
          url: imageUrl,
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
      images: [imageUrl],
    },
  };
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
      topManager: user?.topManager || null,
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
    isScheduled: event.isScheduled,
    startDate: event.startDate ? event.startDate.toISOString() : null,
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
        topManager: p.topManager,
      }))
      .sort((a: any, b: any) => b.totalEarned - a.totalEarned),
  };

  return <BoostDetailClient event={serializedEvent} />;
}
