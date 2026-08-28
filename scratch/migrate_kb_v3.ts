import "dotenv/config";
import clientPromise from "../lib/mongodb";

async function run() {
  try {
    const client = await clientPromise;
    const db = client.db();

    console.log("Starting KB V3 Migration...");

    // Fetch all categories to create a map of name -> slug
    const categories = await db.collection("kb_categories").find().toArray();
    const categoryMap: Record<string, string> = {};
    for (const cat of categories) {
      categoryMap[cat.name] = cat.slug;
    }
    
    // Update all articles to have categorySlug based on their category name
    const articles = await db.collection("kb_articles").find().toArray();
    let articleUpdates = 0;
    for (const article of articles) {
      const catSlug = categoryMap[article.category] || "uncategorized";
      await db.collection("kb_articles").updateOne(
        { _id: article._id },
        { $set: { categorySlug: catSlug } }
      );
      articleUpdates++;
    }

    console.log(`Updated ${articleUpdates} articles with categorySlug.`);
    console.log("Migration V3 complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

run();
