import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db();
    
    console.log("Connected to MongoDB. Starting fleet costs migration...");

    const garages = await db.collection("garages").find({ fleetSlot: { $gt: 1 } }).toArray();
    console.log(`Found ${garages.length} garages with fleet slot > 1 to migrate.`);

    let updatedCount = 0;

    for (const garage of garages) {
      let newFleetOpCost = 0;
      if (garage.fleetSlot > 1) {
        for (let i = 2; i <= garage.fleetSlot; i++) {
          const tier = Math.floor((i - 1) / 3);
          newFleetOpCost += 250 + (tier * 250);
        }
      }

      const currentFuelOpCost = garage.fuel_operational_cost || 0;
      const newTotalOpCost = newFleetOpCost + currentFuelOpCost;

      // Only update if there's a difference
      if (garage.fleet_operational_cost !== newFleetOpCost || garage.operational_cost !== newTotalOpCost) {
        await db.collection("garages").updateOne(
          { _id: garage._id },
          { 
            $set: { 
              fleet_operational_cost: newFleetOpCost,
              operational_cost: newTotalOpCost
            } 
          }
        );
        console.log(`-> Migrated Garage ${garage.discordId}: Fleet Ops Cost ${garage.fleet_operational_cost} -> ${newFleetOpCost}`);
        updatedCount++;
      }
    }

    console.log(`\n✅ Fleet costs migration completed! Updated ${updatedCount} garages.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.close();
  }
}

run();
