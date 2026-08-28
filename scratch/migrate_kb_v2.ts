import "dotenv/config";
import clientPromise from "../lib/mongodb";

function generateSlug(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')       // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-');    // Replace multiple - with single -
}

async function run() {
  try {
    const client = await clientPromise;
    const db = client.db();

    console.log("Starting KB V2 Migration...");

    // 1. Update Categories to have slugs
    const categories = await db.collection("kb_categories").find().toArray();
    let catUpdates = 0;
    for (const cat of categories) {
      if (!cat.slug) {
        const slug = generateSlug(cat.name);
        await db.collection("kb_categories").updateOne(
          { _id: cat._id },
          { $set: { slug } }
        );
        catUpdates++;
        console.log(`Updated category ${cat.name} with slug ${slug}`);
      }
    }
    console.log(`Updated ${catUpdates} categories.`);

    // 2. Update Articles to have descriptions
    const articleUpdateResult = await db.collection("kb_articles").updateMany(
      { description: { $exists: false } },
      { $set: { description: "" } }
    );
    console.log(`Updated ${articleUpdateResult.modifiedCount} articles with default description.`);

    console.log("Migration V2 complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
