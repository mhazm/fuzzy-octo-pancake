import clientPromise from "@/lib/mongodb";
import FullGridCalendar from "@/components/FullGridCalendar";
import type { CalendarEvent } from "@/components/HomeEventsCalendar";
import { CalendarDays } from "lucide-react";
import { slugify } from "@/lib/utils";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kalender Kegiatan & Event Komunitas",
  description: "Kalender terpadu jadwal konvoi mabar, event boost NC, rilis kupon, dan agenda komunitas Nismara Transport.",
  openGraph: {
    title: "Kalender Kegiatan & Event Komunitas",
    description: "Kalender terpadu jadwal konvoi mabar, event boost NC, rilis kupon, dan agenda komunitas Nismara Transport.",
    url: "https://transport.nismara.web.id/calendar",
    siteName: "Nismara Transport",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://images.nismara.my.id/227300_188.jpg",
        width: 1200,
        height: 630,
        alt: "Kalender Kegiatan Nismara Transport",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kalender Kegiatan & Event Komunitas",
    description: "Kalender terpadu jadwal konvoi mabar, event boost NC, rilis kupon, dan agenda komunitas Nismara Transport.",
    images: ["https://images.nismara.my.id/227300_188.jpg"],
  },
};

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const client = await clientPromise;
  const db = client.db();

  // Fetch all events for the calendar (could be filtered by a specific range, but for now we fetch all since they are lightweight)
  const [convoys, contracts, boosts, coupons, goals] = await Promise.all([
    db.collection("convoylobby").find({}).toArray(),
    db.collection("contracts").find({}).toArray(),
    db.collection("ncevents").find({}).toArray(),
    db.collection("coupons").find({}).toArray(),
    db.collection("communitygoals").find({}).toArray(),
  ]);

  const events: CalendarEvent[] = [];

  // 1. CONVOYS
  convoys.forEach((c) => {
    if (c.meetupDate) {
      events.push({
        id: c._id.toString(),
        title: c.convoyName || "Convoy Mabar",
        type: "convoy",
        date: new Date(c.meetupDate),
        href: `/convoy/${c.convoyUri}`,
        imageUrl: c.imageUrl,
      });
    }
  });

  // 2. SPECIAL CONTRACTS
  contracts.forEach((c) => {
    const title = c.contractName || c.title || "Special Contract";
    const slug = c.slug || slugify(title);
    const startDate = c.startDate || c.startAt || c.setAt || c.createdAt || c.endAt;
    const endDate = c.endAt || c.startDate || c.setAt || c.createdAt;

    if (startDate || endDate) {
      events.push({
        id: c._id.toString(),
        title,
        type: "contract",
        date: new Date(startDate || endDate),
        endDate: endDate ? new Date(endDate) : undefined,
        href: `/special-contracts/${slug}`,
        imageUrl: c.imageUrl,
      });
    }
  });

  // 3. NC BOOSTS
  boosts.forEach((b) => {
    const boostPercent = Math.round(Number(b.multiplier || 0) * 100);
    const title = b.nameEvent
      ? `${b.nameEvent} (+${boostPercent}% NC)`
      : `+${boostPercent}% NC Boost Event`;
    const startDate = b.startDate || b.setAt || b.createdAt || b.endAt;
    const endDate = b.endAt || startDate;

    if (startDate || endDate) {
      events.push({
        id: b._id.toString(),
        title,
        type: "boost",
        date: new Date(startDate || endDate),
        endDate: endDate ? new Date(endDate) : undefined,
        href: `/currency-boost/${b.slug || slugify(b.nameEvent || "boost")}`,
        imageUrl: b.imageUrl,
      });
    }
  });

  // 4. COUPONS
  coupons.forEach((c) => {
    if (c.expiredAt) {
      events.push({
        id: c._id.toString(),
        title: `Kupon: ${c.code}`,
        type: "coupon",
        date: new Date(c.createdAt || c.expiredAt),
        endDate: new Date(c.expiredAt),
        href: `/coupons/${c.code}`,
      });
    }
  });

  // 5. COMMUNITY GOALS
  goals.forEach((g) => {
    if (g.endAt) {
      events.push({
        id: g._id.toString(),
        title: g.title || "Community Goal",
        type: "goal",
        date: new Date(g.startAt || g.endAt),
        endDate: new Date(g.endAt),
        href: `/community-goals/${g.slug}`,
        imageUrl: g.imageUrl,
      });
    }
  });

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/20 rounded-lg">
              <CalendarDays className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest">
              Schedule & Events
            </h2>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-6">
            Community <span className="text-gradient">Calendar</span>
          </h1>
          <p className="text-gray-400 max-w-3xl text-lg leading-relaxed">
            Jadwal seluruh aktivitas, periode promo, misi komunitas, hingga rute konvoi Nismara Transport. 
            Pantau dan ikuti setiap kegiatannya agar Anda tidak tertinggal momen seru!
          </p>
        </div>

        <FullGridCalendar events={events} />
      </div>
    </main>
  );
}
