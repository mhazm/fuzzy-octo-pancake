import clientPromise from "@/lib/mongodb";
import FullGridCalendar from "@/components/FullGridCalendar";
import type { CalendarEvent } from "@/components/HomeEventsCalendar";
import { CalendarDays } from "lucide-react";

export const metadata = {
  title: "Community Calendar",
  description: "Kalender event komunitas Nismara Transport",
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
    if (c.endAt) {
      events.push({
        id: c._id.toString(),
        title: c.title || "Special Contract",
        type: "contract",
        date: new Date(c.startAt || c.endAt),
        endDate: new Date(c.endAt),
        href: `/special-contracts/${c.slug}`,
        imageUrl: c.imageUrl,
      });
    }
  });

  // 3. NC BOOSTS
  boosts.forEach((b) => {
    if (b.endAt) {
      events.push({
        id: b._id.toString(),
        title: b.title || `${b.multiplier || 2}x NC Boost Event`,
        type: "boost",
        date: new Date(b.setAt || b.endAt),
        endDate: new Date(b.endAt),
        href: `/currency-boost/${b.slug}`,
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
