import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const client = await clientPromise;
  const db = client.db();
  const histories = await db.collection("nceventhistories").find({}).toArray();
  
  let count = 0;
  for (const h of histories) {
    let slug = h.nameEvent ? h.nameEvent.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now() + Math.floor(Math.random() * 1000) : "event-" + Date.now() + Math.floor(Math.random() * 1000);
    
    // Check if it's already migrated (same nameEvent and similar setBy)
    const existing = await db.collection("ncevents").findOne({ nameEvent: h.nameEvent });
    if (!existing) {
      await db.collection("ncevents").insertOne({
        guildId: h.guildId || "863959415702028318",
        slug: slug,
        nameEvent: h.nameEvent,
        multiplier: h.multiplier,
        imageUrl: h.imageUrl,
        type: "all",
        gameId: "all",
        participants: [],
        isActive: false,
        setBy: h.setBy || "System",
        setAt: h.setAt || h.createdAt || new Date(),
        endAt: h.endDate || h.endAt || new Date(),
        createdAt: h.createdAt || new Date(),
        updatedAt: h.updatedAt || new Date()
      });
      count++;
    }
  }
  
  return NextResponse.json({ migrated: count, totalFound: histories.length });
}
