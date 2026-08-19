import fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function migrateFleets() {
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

    // 1. Load users to map truckyId -> discordId
    console.log("Loading users...");
    const users = await db.collection("users").find({ truckyId: { $exists: true, $ne: null } }).toArray();
    const truckyToDiscordMap: Record<string, string> = {};
    for (const user of users) {
      if (user.truckyId && user.discordId) {
        truckyToDiscordMap[String(user.truckyId)] = user.discordId;
      }
    }
    console.log(`Loaded ${users.length} users with truckyId.`);

    // 2. Load fleetstores to map model.id -> ObjectId and maintenance costs
    console.log("Loading fleetstores...");
    const fleetStores = await db.collection("fleetstores").find({}).toArray();
    const modelMap: Record<string, any> = {};
    for (const store of fleetStores) {
      if (store.id) {
        modelMap[String(store.id)] = {
          _id: store._id,
          maintenance: store.component_cost_maintenance || {
            engine: 45000,
            tires: 20000,
            transmission: 80000,
            brakes: 25000
          }
        };
      }
    }
    console.log(`Loaded ${fleetStores.length} fleetstore models.`);

    // 3. Read JSON data
    console.log("Reading response_fleet_trucky_api.json...");
    const jsonPath = path.resolve(process.cwd(), 'response_fleet_trucky_api.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const truckyFleets = JSON.parse(rawData);
    console.log(`Found ${truckyFleets.length} fleets in JSON.`);

    // 4. Prepare bulk operations
    const bulkOps = [];
    
    for (const fleet of truckyFleets) {
      // Find model
      const modelIdStr = fleet.model?.id ? String(fleet.model.id) : null;
      let modelData = null;
      if (modelIdStr && modelMap[modelIdStr]) {
        modelData = modelMap[modelIdStr];
      } else {
        console.warn(`Warning: Fleet ${fleet.fleet_number} has unknown model id ${modelIdStr}. Skipping model reference.`);
      }

      // Find owner
      const driverIdStr = fleet.driver?.id ? String(fleet.driver.id) : null;
      const ownerDiscordId = driverIdStr ? truckyToDiscordMap[driverIdStr] : null;

      const updateData: any = {
        id: Number(fleet.id),
        fleet_number: fleet.fleet_number,
        odometer: 0,
        wear: {
          unfix_engine: 0,
          unfix_tires: 0,
          unfix_transmission: 0,
          unfix_brakes: 0
        }
      };

      if (modelData) {
        updateData.model = modelData._id;
        updateData.maintenance = modelData.maintenance;
      }

      if (ownerDiscordId) {
        updateData.owner = ownerDiscordId;
        updateData.driver = ownerDiscordId; // legacy sync
      } else if (!fleet.driver) {
        // if explicitly unassigned in trucky
        updateData.owner = null;
        updateData.driver = null;
      }

      bulkOps.push({
        updateOne: {
          filter: { id: Number(fleet.id) },
          update: {
            $set: updateData,
            $setOnInsert: {
              createdAt: new Date(),
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      });
    }

    if (bulkOps.length > 0) {
      console.log(`Executing bulkWrite for ${bulkOps.length} fleets...`);
      const result = await db.collection("fleets").bulkWrite(bulkOps);
      console.log(`Bulk write complete:`);
      console.log(` - Upserted: ${result.upsertedCount}`);
      console.log(` - Modified: ${result.modifiedCount}`);
      console.log(` - Inserted: ${result.insertedCount}`);
      console.log(` - Matched: ${result.matchedCount}`);
    } else {
      console.log("No operations to perform.");
    }

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB.");
  }
}

migrateFleets();
