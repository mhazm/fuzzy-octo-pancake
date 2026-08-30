import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI in .env.local");
  process.exit(1);
}

const client = new MongoClient(uri);

function calculateFuelOpCost(level: number): number {
  let cost = 0;
  for (let i = 2; i <= level; i++) {
    const tier = Math.floor((i - 1) / 5);
    cost += (200 + (tier * 100));
  }
  return cost;
}

async function run() {
  try {
    await client.connect();
    const db = client.db();

    console.log("==================================================");
    console.log("Connected to MongoDB. Scanning for fuel overflow...");
    console.log("==================================================");

    const garages = await db.collection("garages").find({}).toArray();
    let overflowingGarages = [];

    for (const garage of garages) {
      const stock = garage.fuelStock || 0;
      const listed = garage.fuelListed || 0;
      const capacity = garage.fuelCapacity || 2000;
      const totalPhysical = stock + listed;

      if (totalPhysical > capacity) {
        overflowingGarages.push({
          garage,
          stock,
          listed,
          capacity,
          totalPhysical,
        });
      }
    }

    console.log(`Found ${overflowingGarages.length} garages with fuel exceeding capacity.\n`);

    let remediatedCount = 0;

    for (const item of overflowingGarages) {
      const { garage, stock, listed, capacity, totalPhysical } = item;
      const currentLevel = garage.fuelTankLevel || 1;

      // Hitung kapasitas dan level baru yang mencukupi
      const overflow = totalPhysical - 2000;
      const neededAdditionalLevels = Math.ceil(overflow / 1000);
      const newLevel = Math.max(currentLevel, 1 + neededAdditionalLevels);
      const newCapacity = 2000 + ((newLevel - 1) * 1000);

      const newFuelOpCost = calculateFuelOpCost(newLevel);
      const fleetOpCost = garage.fleet_operational_cost || 0;
      const safeboxOpCost = garage.safebox_operational_cost || 0;
      const newTotalOpCost = fleetOpCost + newFuelOpCost + safeboxOpCost;

      console.log(`[REMEDIATE] Driver Discord ID: ${garage.discordId}`);
      console.log(`  - Total Physical Fuel: ${totalPhysical.toLocaleString("id-ID")} L (Stock: ${stock.toLocaleString("id-ID")} L, Listed: ${listed.toLocaleString("id-ID")} L)`);
      console.log(`  - Old Level / Cap: Lvl ${currentLevel} (${capacity.toLocaleString("id-ID")} L) -> New Level / Cap: Lvl ${newLevel} (${newCapacity.toLocaleString("id-ID")} L)`);
      console.log(`  - Old Fuel Op Cost: ${(garage.fuel_operational_cost || 0).toLocaleString("id-ID")} NC -> New Fuel Op Cost: ${newFuelOpCost.toLocaleString("id-ID")} NC`);
      console.log(`  - Old Total Op Cost: ${(garage.operational_cost || 0).toLocaleString("id-ID")} NC -> New Total Op Cost: ${newTotalOpCost.toLocaleString("id-ID")} NC\n`);

      await db.collection("garages").updateOne(
        { _id: garage._id },
        {
          $set: {
            fuelCapacity: newCapacity,
            fuelTankLevel: newLevel,
            fuel_operational_cost: newFuelOpCost,
            operational_cost: newTotalOpCost,
          }
        }
      );

      remediatedCount++;
    }

    console.log("==================================================");
    console.log(`✅ Remediation completed! Successfully updated ${remediatedCount} garages.`);
    console.log("==================================================");

  } catch (error) {
    console.error("Remediation error:", error);
  } finally {
    await client.close();
  }
}

run();
