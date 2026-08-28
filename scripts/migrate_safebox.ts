import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function migrateSafebox() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("No MONGODB_URI in .env.local");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    // 1. Dapatkan semua tiket penalti yang aktif
    const activeTickets = await db
      .collection("penaltytickets")
      .find({ status: "active" })
      .toArray();

    console.log(`Ditemukan ${activeTickets.length} tiket penalti aktif.`);

    // 2. Hitung jumlah tiket per userId (menggunakan discordId dan amount)
    const userTicketCounts: Record<string, number> = {};
    for (const ticket of activeTickets) {
      const userId = ticket.discordId || ticket.userId; // fallback
      if (!userId) continue;

      if (!userTicketCounts[userId]) {
        userTicketCounts[userId] = 0;
      }
      // Tambahkan berdasarkan field `amount` (jika ada), jika tidak default ke 1
      const amount = typeof ticket.amount === "number" ? ticket.amount : (ticket.ticketAmount || 1);
      userTicketCounts[userId] += amount;
    }

    // 3. Update koleksi garages
    for (const userId of Object.keys(userTicketCounts)) {
      const count = userTicketCounts[userId];
      
      // Calculate minimum level needed to hold `count` tickets
      // Level 1 = 10, Level 2 = 15, Level 3 = 20, dll
      const requiredLevel = Math.max(1, Math.ceil((count - 10) / 5) + 1);
      
      // We will use $set for safeboxLevel (or $max so we don't downgrade accidentally)
      await db.collection("garages").updateOne(
        { discordId: userId },
        { 
          $inc: { safeboxStock: count },
          $max: { safeboxLevel: requiredLevel }
        }
      );
      console.log(`Migrasi ${count} tiket untuk user ${userId}. Level minimal safebox: ${requiredLevel}`);
    }

    console.log("Migrasi safeboxStock selesai.");

    // (Opsional) Hapus koleksi penaltytickets jika Anda yakin
    // await db.collection("penaltytickets").drop();
    // console.log("Koleksi penaltytickets telah dihapus.");

  } catch (error) {
    console.error("Gagal melakukan migrasi:", error);
  } finally {
    await client.close();
  }
}

migrateSafebox();
