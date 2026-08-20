const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const path = require("path");

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Ganti non-alphanumeric dengan dash
    .replace(/^-+|-+$/g, ""); // Hapus dash di awal/akhir
}

async function run() {
  console.log("Menghubungkan ke MongoDB...");
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();
    
    console.log("Mengambil semua achievements...");
    const achievements = await db.collection("achievements").find({}).toArray();
    console.log(`Ditemukan ${achievements.length} achievements.`);

    let updatedCount = 0;
    for (const ach of achievements) {
      if (!ach.name) continue;

      let slug = generateSlug(ach.name);
      
      // Jika slug berbeda atau belum ada
      if (ach.slug !== slug) {
        // Cek duplicate
        const exist = await db.collection("achievements").findOne({ slug, _id: { $ne: ach._id } });
        if (exist) {
          slug = `${slug}-${ach._id.toString().slice(-4)}`;
        }

        await db.collection("achievements").updateOne(
          { _id: ach._id },
          { $set: { slug: slug } }
        );
        console.log(`✅ ${ach.name} -> ${slug}`);
        updatedCount++;
      } else {
        console.log(`⏩ ${ach.name} (Slug sudah benar: ${slug})`);
      }
    }

    console.log(`\nMigrasi Selesai! ${updatedCount} dokumen diperbarui.`);
  } catch (error) {
    console.error("Terjadi kesalahan:", error);
  } finally {
    await client.close();
  }
}

run();
