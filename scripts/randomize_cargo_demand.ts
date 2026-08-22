import * as dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";

// Load .env.local FIRST
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const dbConnect = require("../lib/mongoose").default;
  const Cargo = require("../lib/models/Cargo").default;
  const CargoMarketHistory = require("../lib/models/CargoMarketHistory"); // CJS require as it's .js

  console.log("Connecting to database...");
  await dbConnect();
  console.log("Connected. Fetching all cargos...");

  const cargos = await Cargo.find({});
  console.log(`Found ${cargos.length} cargos. Processing...`);

  let updatedCount = 0;

  for (const cargo of cargos) {
    const oldDemand = cargo.market_demand || 0;
    const oldPriceWithChange = cargo.price_per_km_with_market_change || cargo.price_per_km || 0;
    
    // Random demand between 40 and 60
    const newDemand = Math.floor(Math.random() * (60 - 40 + 1)) + 40;
    
    // Formula: price_per_km_with_market_change = price_per_km * (1 + market_demand / 100)
    // Based on observation: 1.28 * (1 + 100/100) = 2.56
    const basePrice = cargo.price_per_km || 0;
    let newPriceWithChange = basePrice * (1 + newDemand / 100);
    // Round to 2 decimal places to be safe
    newPriceWithChange = Math.round(newPriceWithChange * 100) / 100;

    cargo.market_demand = newDemand;
    cargo.price_per_km_with_market_change = newPriceWithChange;

    await cargo.save();

    // Log to CargoMarketHistory
    await CargoMarketHistory.create({
      cargo_id: cargo._id,
      in_game_id: cargo.in_game_id,
      old_market_demand: oldDemand,
      new_market_demand: newDemand,
      old_price: oldPriceWithChange,
      new_price: newPriceWithChange,
    });

    updatedCount++;
  }

  console.log(`Migration complete! Updated ${updatedCount} cargos with randomized demand between 40-60.`);
  process.exit(0);
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
