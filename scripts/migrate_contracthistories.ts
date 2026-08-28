import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI");

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db();
    
    console.log("Mencari data dari contracthistories...");
    const histories = await db.collection("contracthistories").find({}).toArray();
    
    console.log(`Ditemukan ${histories.length} riwayat kontrak.`);
    
    if (histories.length === 0) {
        console.log("Tidak ada data yang perlu dimigrasi.");
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const history of histories) {
      try {
        const doc: any = { ...history };
        
        // Hapus _id agar tidak bentrok, kita generate dokumen baru
        delete doc._id;
        
        const existing = await db.collection("contracts").findOne({ 
            contractName: doc.contractName,
            guildId: doc.guildId,
            isActive: false 
        });

        if (existing) {
            console.log(`[SKIP] Kontrak history ${doc.contractName} sudah termigrasi.`);
            continue;
        }

        // Set properti baru
        doc.isActive = false;
        if (doc.isScheduled === undefined) doc.isScheduled = false;
        if (doc.startDate === undefined) doc.startDate = doc.setAt || new Date();
        
        // Insert ke contracts
        await db.collection("contracts").insertOne(doc);
        successCount++;
        
      } catch (err: any) {
        console.error(`[ERROR] Gagal memigrasi ${history.contractName}:`, err.message);
        failCount++;
      }
    }

    console.log(`\nMigrasi Selesai!`);
    console.log(`Berhasil: ${successCount}`);
    console.log(`Gagal: ${failCount}`);

  } catch (err) {
    console.error("Terjadi kesalahan:", err);
  } finally {
    await client.close();
  }
}

run();
