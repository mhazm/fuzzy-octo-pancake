import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { MongoClient } from "mongodb";
import type { SeasonLevelConfig, RewardItem } from "../lib/models/SeasonPass";

async function run() {
  // Dynamically import SEASON_1_LEVELS after dotenv has loaded
  const { SEASON_1_LEVELS } = await import("../lib/seasonPass");

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI in .env.local");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    console.log("==================================================");
    console.log("Starting Season Pass Fuel Rewards Migration...");
    console.log("==================================================");

    // 1. Update Season 1 with SEASON_1_LEVELS
    const season1 = await db.collection("seasonpasses").findOne({ seasonNumber: 1 });
    if (season1) {
      console.log("Syncing Season 1 levels with updated SEASON_1_LEVELS...");
      await db.collection("seasonpasses").updateOne(
        { seasonNumber: 1 },
        {
          $set: {
            levels: SEASON_1_LEVELS,
          },
        }
      );
      console.log("✅ Season 1 levels successfully updated to new fuel configuration.");
    } else {
      console.log("ℹ️ Season 1 not found in DB. It will be initialized on next startup.");
    }

    // 2. Scan all other seasons in DB to ensure no FUEL reward > 10.000 Liters
    const allSeasons = await db.collection("seasonpasses").find({}).toArray();
    for (const season of allSeasons) {
      if (season.seasonNumber === 1) continue;

      let changed = false;
      const updatedLevels = ((season.levels || []) as SeasonLevelConfig[]).map((lvl: SeasonLevelConfig) => {
        const freeRewards = (lvl.freeRewards || []).map((r: RewardItem) => {
          if (r.type === "FUEL" && r.amount && r.amount > 10000) {
            changed = true;
            return {
              ...r,
              amount: 10000,
              title: "10.000 Liter Fuel Garasi",
            };
          }
          return r;
        });

        const premiumRewards = (lvl.premiumRewards || []).map((r: RewardItem) => {
          if (r.type === "FUEL" && r.amount && r.amount > 10000) {
            changed = true;
            return {
              ...r,
              amount: 10000,
              title: "10.000 Liter Fuel Garasi",
            };
          }
          return r;
        });

        return {
          ...lvl,
          freeRewards,
          premiumRewards,
        };
      });

      if (changed) {
        await db.collection("seasonpasses").updateOne(
          { _id: season._id },
          { $set: { levels: updatedLevels } }
        );
        console.log(`✅ Season ${season.seasonNumber} clamped all FUEL rewards > 10.000 L.`);
      }
    }

    // 3. Verification Scan
    console.log("\n--- Verification Scan ---");
    const verifiedSeasons = await db.collection("seasonpasses").find({}).toArray();
    let anyExceeding = false;

    for (const s of verifiedSeasons) {
      console.log(`\nSeason ${s.seasonNumber} (${s.title}):`);
      for (const lvl of (s.levels || []) as SeasonLevelConfig[]) {
        const allRewards = [...(lvl.freeRewards || []), ...(lvl.premiumRewards || [])];
        for (const r of allRewards) {
          if (r.type === "FUEL") {
            if (r.amount && r.amount > 10000) {
              anyExceeding = true;
              console.error(`  ❌ Level ${lvl.level}: ${r.title} (${r.amount} L) exceeds 10.000 L!`);
            } else if (r.amount && r.amount >= 7000) {
              console.log(`  ✓ Level ${lvl.level}: ${r.title} (${r.amount.toLocaleString("id-ID")} L)`);
            }
          }
        }
      }
    }

    if (!anyExceeding) {
      console.log("\n🎉 All Season Pass fuel rewards are now safely capped at maximum 10.000 Liters!");
    } else {
      console.error("\n⚠️ Some fuel rewards still exceed 10.000 Liters. Please inspect.");
    }
    console.log("==================================================");

  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await client.close();
  }
}

run();
