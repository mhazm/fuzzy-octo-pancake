import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import GarageSlot from "../lib/models/GarageSlot";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const slots = [
    { slotId: "ets2-reg-1", game_id: "ets2", type: "regular", condition: 100, status: "available" },
    { slotId: "ets2-reg-2", game_id: "ets2", type: "regular", condition: 100, status: "available" },
    { slotId: "ets2-vip-1", game_id: "ets2", type: "vip", condition: 100, status: "available" },
    { slotId: "ats-reg-1", game_id: "ats", type: "regular", condition: 100, status: "available" },
    { slotId: "ats-reg-2", game_id: "ats", type: "regular", condition: 100, status: "available" },
    { slotId: "ats-vip-1", game_id: "ats", type: "vip", condition: 100, status: "available" },
  ];

  for (const slot of slots) {
    await GarageSlot.findOneAndUpdate(
      { slotId: slot.slotId },
      { $set: slot },
      { upsert: true, new: true }
    );
    console.log(`Seeded: ${slot.slotId}`);
  }

  console.log("Garage slots seeded successfully.");
  mongoose.connection.close();
}

seed();
