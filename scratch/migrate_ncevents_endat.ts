import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load env vars (e.g. MONGODB_URI)
dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const client = new MongoClient(uri);

async function main() {
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection("ncevents");

    // Cari semua event yang punya realEndAt
    const eventsToMigrate = await collection.find({ realEndAt: { $exists: true } }).toArray();

    console.log(`Ditemukan ${eventsToMigrate.length} events dengan realEndAt.`);

    let updatedCount = 0;

    for (const event of eventsToMigrate) {
      if (event.realEndAt) {
        await collection.updateOne(
          { _id: event._id },
          { 
            $set: { endAt: event.realEndAt },
            $unset: { realEndAt: "" } 
          }
        );
        updatedCount++;
      }
    }

    console.log(`Migrasi Selesai! Berhasil mengupdate ${updatedCount} events.`);
  } catch (err) {
    console.error("Terjadi error:", err);
  } finally {
    await client.close();
  }
}

main();
