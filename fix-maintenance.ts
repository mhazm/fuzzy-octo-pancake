import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fixMaintenance() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not defined in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB.");
    const db = client.db();

    const result = await db.collection("fleets").updateMany(
      { "maintenance.engine": { $lt: 40000 } },
      {
        $set: {
          maintenance: {
            engine: 50000,
            tires: 20000,
            transmission: 70000,
            brakes: 35000
          }
        }
      }
    );

    console.log(`Successfully updated ${result.modifiedCount} fleets with incorrect maintenance intervals.`);

  } catch (error) {
    console.error("Script failed:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB.");
  }
}

fixMaintenance();
