import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import type { CalendarEvent } from "@/components/HomeEventsCalendar";
import { slugify } from "@/lib/utils";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

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

    // Membatasi data agar tidak membebani token LLM (MCP Context Window)
    // 1. Hapus URL gambar yang tidak bisa dilihat LLM dan makan banyak token
    const cleanEvents = events.map(ev => ({
      id: ev.id,
      title: ev.title,
      type: ev.type,
      date: ev.date,
      endDate: ev.endDate,
      href: ev.href
    }));

    // 2. Filter event agar hanya menampilkan event yang aktif atau berlalu kurang dari 30 hari
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const relevantEvents = cleanEvents.filter(e => {
      const referenceDate = e.endDate || e.date;
      return referenceDate > thirtyDaysAgo;
    });

    // 3. Urutkan secara kronologis dari yang terdekat
    relevantEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 4. Batasi maksimal 50 event terbaru
    const finalEvents = relevantEvents.slice(-50);

    return NextResponse.json(finalEvents);
  } catch (error) {
    console.error("GET MCP Events Error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data events untuk MCP" },
      { status: 500 }
    );
  }
}
