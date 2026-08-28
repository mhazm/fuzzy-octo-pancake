import "dotenv/config";
import clientPromise from "../lib/mongodb";

async function run() {
  try {
    const client = await clientPromise;
    const db = client.db();

    console.log("Starting KB Categories migration...");

    const distinctCategories = await db.collection("kb_articles").distinct("category");
    console.log("Found distinct categories:", distinctCategories);

    let orderCounter = 0;
    for (const catName of distinctCategories) {
      if (!catName) continue;
      
      const existing = await db.collection("kb_categories").findOne({ name: catName });
      if (!existing) {
        await db.collection("kb_categories").insertOne({
          name: catName,
          order: orderCounter,
          createdAt: new Date()
        });
        console.log(`Inserted category: ${catName} with order ${orderCounter}`);
        orderCounter++;
      }
    }

    const updateResult = await db.collection("kb_articles").updateMany(
      { order: { $exists: false } },
      { $set: { order: 0 } }
    );
    console.log(`Updated ${updateResult.modifiedCount} articles with order: 0`);

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
