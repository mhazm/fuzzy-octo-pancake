import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);

async function migrate() {
  try {
    await client.connect();
    const db = client.db();
    
    console.log("Migrating existing ncevents...");
    const existingEvents = await db.collection("ncevents").find({}).toArray();
    for (const ev of existingEvents) {
      const nameStr = ev.nameEvent || "event";
      let slug = nameStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      if (!slug) slug = "event-" + Date.now();
      
      let uniqueSlug = slug;
      let counter = 1;
      while (await db.collection("ncevents").findOne({ slug: uniqueSlug, _id: { $ne: ev._id } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      
      const isExpired = ev.endAt ? new Date() > new Date(ev.endAt) : false;
      const wasActive = ev.isActive !== undefined ? ev.isActive : !isExpired;
      
      await db.collection("ncevents").updateOne({ _id: ev._id }, {
        $set: {
          slug: uniqueSlug,
          type: ev.type || "all",
          gameId: ev.gameId || "all",
          participants: ev.participants || [],
          isActive: wasActive,
        }
      });
    }

    console.log("Migrating nceventhistories...");
    const histories = await db.collection("nceventhistories").find({}).toArray();
    for (const h of histories) {
      const nameStr = h.nameEvent || "event";
      let slug = nameStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      if (!slug) slug = "event-" + Date.now();
      
      let uniqueSlug = slug;
      let counter = 1;
      while (await db.collection("ncevents").findOne({ slug: uniqueSlug })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      await db.collection("ncevents").insertOne({
        guildId: h.guildId || "863959415702028318",
        slug: uniqueSlug,
        nameEvent: h.nameEvent,
        multiplier: h.multiplier,
        imageUrl: h.imageUrl,
        type: "all",
        gameId: "all",
        participants: [],
        isActive: false, // history is not active
        setBy: h.setBy || "System",
        setAt: h.setAt || h.createdAt || new Date(),
        endAt: h.endDate || h.endAt || new Date(),
        createdAt: h.createdAt || new Date(),
        updatedAt: h.updatedAt || new Date(),
      });
    }
    
    console.log("Done migrating!");
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

migrate();
