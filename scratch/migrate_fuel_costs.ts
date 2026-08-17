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
    
    console.log("Connected to MongoDB. Starting fuel operational cost migration...");

    const garages = await db.collection("garages").find({}).toArray();
    let updatedCount = 0;

    for (const garage of garages) {
      const level = garage.fuelTankLevel || 1;
      
      // Hitung ulang fuel_operational_cost menggunakan skema tier baru
      // (Mulai level 2, tiap kelipatan 5 tambah 100)
      let newFuelOpCost = 0;
      for (let i = 2; i <= level; i++) {
        const tier = Math.floor((i - 1) / 5);
        newFuelOpCost += (200 + (tier * 100));
      }

      const fleetOpCost = garage.fleet_operational_cost || 0;
      const newTotalOpCost = newFuelOpCost + fleetOpCost;

      // Hanya update jika nilainya tidak sinkron dengan sistem baru
      if (garage.fuel_operational_cost !== newFuelOpCost || garage.operational_cost !== newTotalOpCost) {
        await db.collection("garages").updateOne(
          { _id: garage._id },
          {
            $set: {
              fuel_operational_cost: newFuelOpCost,
              operational_cost: newTotalOpCost
            }
          }
        );
        
        console.log(`-> Updated Garage ${garage.discordId} (Lvl ${level}) | Old Fuel Cost: ${garage.fuel_operational_cost} NC | New Fuel Cost: ${newFuelOpCost} NC | New Total: ${newTotalOpCost} NC`);
        updatedCount++;
      }
    }

    console.log(`\n✅ Migration completed successfully! Updated ${updatedCount} garages.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.close();
  }
}

run();
