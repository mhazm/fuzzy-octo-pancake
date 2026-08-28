import clientPromise from "@/lib/mongodb";
import HomeEventsCalendar, { CalendarEvent } from "./HomeEventsCalendar";

export default async function HomeEventsWrapper() {
  const client = await clientPromise;
  const db = client.db();

  const now = new Date();
  // Ambil event dari 1 bulan lalu hingga 2 bulan ke depan untuk efisiensi
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Jalankan query secara paralel agar cepat
  const [convoys, contracts, boosts, coupons, goals] = await Promise.all([
    db.collection("convoylobby").find({}).toArray(),
    db.collection("contracts").find({}).toArray(),
    db.collection("ncevents").find({}).toArray(), // NC Boosts events
    db.collection("coupons").find({}).toArray(),
    db.collection("communitygoals").find({}).toArray(),
  ]);

  const events: CalendarEvent[] = [];

  // 1. CONVOYS
  convoys.forEach(c => {
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
  contracts.forEach(c => {
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

  // 3. NC BOOSTS (ncevents)
  boosts.forEach(b => {
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
  coupons.forEach(c => {
    if (c.expiredAt) {
      events.push({
        id: c._id.toString(),
        title: `Kupon Spesial: ${c.code}`,
        type: "coupon",
        date: new Date(c.createdAt || c.expiredAt),
        endDate: new Date(c.expiredAt),
        href: `/coupons/${c.code}`,
      });
    }
  });

  // 5. COMMUNITY GOALS
  goals.forEach(g => {
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

  return <HomeEventsCalendar events={events} />;
}
