import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const calculateSafeboxOpCost = (level: number) => {
  let totalCost = 0;
  for (let i = 2; i <= level; i++) {
    const tier = Math.floor((i - 2) / 3);
    totalCost += 250 + tier * 150;
  }
  return totalCost;
};

async function fixCosts() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("No MONGODB_URI in .env.local");

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    const garages = await db.collection("garages").find({}).toArray();
    let updatedCount = 0;

    for (const garage of garages) {
      const safeboxLevel = garage.safeboxLevel || 1;
      const newSafeboxCost = calculateSafeboxOpCost(safeboxLevel);
      
      const fleetCost = garage.fleet_operational_cost || 0;
      const fuelCost = garage.fuel_operational_cost || 0;
      
      const newTotalOpCost = fleetCost + fuelCost + newSafeboxCost;

      // Update Garage dokumen
      await db.collection("garages").updateOne(
        { _id: garage._id },
        { 
          $set: { 
            safebox_operational_cost: newSafeboxCost,
            operational_cost: newTotalOpCost
          }
        }
      );
      
      console.log(`Garasi ${garage.discordId}: Safebox Lvl ${safeboxLevel} -> OpCost: ${newSafeboxCost} | Total OpCost: ${newTotalOpCost}`);
      updatedCount++;
    }

    console.log(`Selesai! Berhasil memperbaiki biaya operasional untuk ${updatedCount} garasi.`);
  } catch (error) {
    console.error("Gagal melakukan fix:", error);
  } finally {
    await client.close();
  }
}

fixCosts();
