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
    
    console.log("Connected to MongoDB. Starting fuel market listing migration...");

    const activeListings = await db.collection("fuelmarketlistings").find({ status: "active" }).toArray();
    console.log(`Found ${activeListings.length} active listings.`);

    // Kelompokkan total bensin yang dijual berdasarkan discordId
    const listedAmounts: Record<string, number> = {};
    for (const listing of activeListings) {
      const sellerId = listing.sellerDiscordId;
      if (!sellerId) continue;
      if (!listedAmounts[sellerId]) listedAmounts[sellerId] = 0;
      listedAmounts[sellerId] += listing.amount;
    }

    let updatedCount = 0;
    let upgradedCount = 0;

    for (const [discordId, amountToAdd] of Object.entries(listedAmounts)) {
      const garage = await db.collection("garages").findOne({ discordId });
      
      if (!garage) {
        console.warn(`WARNING: Garage not found for discordId: ${discordId}`);
        continue;
      }

      const currentCapacity = garage.fuelCapacity || 2000;
      const currentLevel = garage.fuelTankLevel || 1;
      const currentStock = garage.fuelStock || 0;
      const currentListed = garage.fuelListed || 0;
      
      const newFuelListed = currentListed + amountToAdd;
      const totalPhysicalFuel = currentStock + newFuelListed;

      const updates: any = {
        fuelListed: newFuelListed
      };

      if (totalPhysicalFuel > currentCapacity) {
        // Upgrade paksa
        const overflow = totalPhysicalFuel - currentCapacity;
        const multiplier = Math.ceil(overflow / 1000);
        const newCapacity = currentCapacity + (multiplier * 1000);
        const newLevel = currentLevel + multiplier;

        let totalOpCostIncrease = 0;
        for (let i = currentLevel + 1; i <= newLevel; i++) {
          const tier = Math.floor((i - 1) / 5);
          totalOpCostIncrease += (200 + (tier * 100));
        }

        const newFuelOpCost = (garage.fuel_operational_cost || 0) + totalOpCostIncrease;
        const newTotalOpCost = newFuelOpCost + (garage.fleet_operational_cost || 0);

        updates.fuelCapacity = newCapacity;
        updates.fuelTankLevel = newLevel;
        updates.fuel_operational_cost = newFuelOpCost;
        updates.operational_cost = newTotalOpCost;

        console.log(`[UPGRADE] Garage ${discordId}: Forced upgrade by ${multiplier} levels. New Cap: ${newCapacity}L (Lvl ${newLevel}).`);
        upgradedCount++;
      }

      await db.collection("garages").updateOne(
        { _id: garage._id },
        { $set: updates }
      );
      
      console.log(`-> Migrated Garage ${discordId}: fuelListed set to ${newFuelListed}L.`);
      updatedCount++;
    }

    console.log(`\n✅ Migration completed! Updated ${updatedCount} garages (Force upgraded ${upgradedCount} garages).`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.close();
  }
}

run();
