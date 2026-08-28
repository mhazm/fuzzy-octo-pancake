const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    const user = await db.collection("users").findOne({ name: "ciminyaw" });
    console.log("User data:", user);
    
  } finally {
    await client.close();
  }
}
run().catch(console.error);
