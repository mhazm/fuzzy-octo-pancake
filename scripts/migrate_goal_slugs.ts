import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function migrateSlugs() {
  console.log("Starting slug migration for Community Goals...");
  const client = await MongoClient.connect(process.env.MONGODB_URI as string);
  const db = client.db();

  const goals = await db.collection("communitygoals").find({ slug: { $exists: false } }).toArray();
  console.log(`Found ${goals.length} goals without slugs.`);

  for (const goal of goals) {
    let baseSlug = goal.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    // check uniqueness
    let slug = baseSlug;
    let count = 1;
    while (await db.collection("communitygoals").findOne({ slug })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    await db.collection("communitygoals").updateOne(
      { _id: goal._id },
      { $set: { slug } }
    );
    console.log(`Updated goal ${goal._id} with slug: ${slug}`);
  }

  console.log("Migration completed.");
  await client.close();
}

migrateSlugs().catch(console.error);
