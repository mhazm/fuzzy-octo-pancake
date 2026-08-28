const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    
    // Check what a COMPLETED job looks like
    const job = await db.collection("jobhistories").findOne({ jobStatus: 'COMPLETED' });
    console.log("Sample COMPLETED job:");
    console.log(job);
    
  } finally {
    await client.close();
  }
}
run().catch(console.error);
