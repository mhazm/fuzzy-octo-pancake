import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables dari .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("Please add your Mongo URI to .env.local");
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Terhubung ke database!");

    const db = client.db(); // Gunakan default db dari URI
    const validatedJobsCollection = db.collection("validatedjobs");

    // Cari dokumen yang belum memiliki field 'type'
    const query = { type: { $exists: false } };
    
    // Karena semua data lama pada koleksi validatedjobs digunakan HANYA untuk point reduction,
    // kita set semuanya menjadi "point_reduction"
    const update = { $set: { type: "point_reduction" } };

    const result = await validatedJobsCollection.updateMany(query, update);

    console.log(`Migrasi Selesai!`);
    console.log(`Total dokumen yang diperbarui: ${result.modifiedCount}`);

  } catch (error) {
    console.error("Terjadi kesalahan saat migrasi:", error);
  } finally {
    await client.close();
    console.log("Koneksi database ditutup.");
  }
}

run().catch(console.dir);
