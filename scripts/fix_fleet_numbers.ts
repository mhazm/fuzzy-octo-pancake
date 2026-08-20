import * as dotenv from "dotenv";
import path from "path";

// Load .env.local FIRST
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const dbConnect = require("../lib/mongoose").default;
  const Fleet = require("../lib/models/Fleet").default;

  console.log("Connecting to database...");
  await dbConnect();
  console.log("Connected. Fetching all fleets...");

  const fleets = await Fleet.find({});
  console.log(`Found ${fleets.length} fleets. Processing...`);

  let updatedCount = 0;

  for (const fleet of fleets) {
    let rawPlatNumber = fleet.fleet_number || "";
    let platNumber = rawPlatNumber.trim().toUpperCase().replace(/\s+/g, "");
    platNumber = platNumber.replace(/^NL-?/, ""); // Remove existing NL or NL-
    const newPlatNumber = `NL-${platNumber}`;

    if (fleet.fleet_number !== newPlatNumber) {
      console.log(`Updating ${fleet.fleet_number} -> ${newPlatNumber} (Trucky ID: ${fleet.id})`);
      fleet.fleet_number = newPlatNumber;
      await fleet.save();
      updatedCount++;
    }
  }

  console.log(`Migration complete! Updated ${updatedCount} fleets.`);
  process.exit(0);
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
