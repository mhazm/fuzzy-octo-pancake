import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI as string;

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection("gallery_posts");

    const posts = await collection.find({}).toArray();
    let updatedCount = 0;

    for (const post of posts) {
      if (post.tags && Array.isArray(post.tags)) {
        let newTags: string[] = [];
        let needsUpdate = false;

        for (const tag of post.tags) {
          if (tag.includes(" ") || tag.includes(",")) {
            needsUpdate = true;
            const splitTags = tag.split(/[\s,]+/)
              .map((t: string) => t.trim().toLowerCase().replace(/^#+/, ""))
              .filter((t: string) => t.length > 0);
            newTags.push(...splitTags);
          } else {
            // normal tag
            newTags.push(tag.trim().toLowerCase().replace(/^#+/, ""));
          }
        }

        // Remove duplicates just in case
        newTags = [...new Set(newTags)];

        if (needsUpdate || JSON.stringify(post.tags) !== JSON.stringify(newTags)) {
          await collection.updateOne(
            { _id: post._id },
            { $set: { tags: newTags } }
          );
          updatedCount++;
          console.log(`Updated post ${post._id} with tags:`, newTags);
        }
      }
    }

    console.log(`Migration completed. Updated ${updatedCount} posts.`);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
