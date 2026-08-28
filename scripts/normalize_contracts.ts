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
    
    console.log("Mencari data contracts yang perlu dinormalisasi...");
    
    // Cari dokumen yang memiliki field lama
    const contracts = await db.collection("contracts").find({
      $or: [
        { endDate: { $exists: true } },
        { closedAt: { $exists: true } },
        { durationDays: { $exists: true } }
      ]
    }).toArray();
    
    console.log(`Ditemukan ${contracts.length} kontrak yang perlu dinormalisasi.`);

    let successCount = 0;
    let failCount = 0;

    for (const contract of contracts) {
      try {
        const updateDoc: any = {
            $set: {},
            $unset: {}
        };

        // 1. Rename endDate ke endAt
        if (contract.endDate) {
            updateDoc.$set.endAt = contract.endDate;
            updateDoc.$unset.endDate = "";
        }

        // 2. Gunakan closedAt sebagai updatedAt (opsional) lalu hapus
        if (contract.closedAt) {
            updateDoc.$set.updatedAt = contract.closedAt;
            updateDoc.$unset.closedAt = "";
        }

        // 3. Hapus durationDays
        if (contract.durationDays !== undefined) {
            updateDoc.$unset.durationDays = "";
        }

        // Hapus property yang kosong agar query valid
        if (Object.keys(updateDoc.$set).length === 0) delete updateDoc.$set;
        if (Object.keys(updateDoc.$unset).length === 0) delete updateDoc.$unset;

        if (updateDoc.$set || updateDoc.$unset) {
            await db.collection("contracts").updateOne(
                { _id: contract._id },
                updateDoc
            );
            successCount++;
        }
        
      } catch (err: any) {
        console.error(`[ERROR] Gagal menormalisasi ${contract.contractName}:`, err.message);
        failCount++;
      }
    }

    console.log(`\nNormalisasi Selesai!`);
    console.log(`Berhasil: ${successCount}`);
    console.log(`Gagal: ${failCount}`);

  } catch (err) {
    console.error("Terjadi kesalahan:", err);
  } finally {
    await client.close();
  }
}

run();
