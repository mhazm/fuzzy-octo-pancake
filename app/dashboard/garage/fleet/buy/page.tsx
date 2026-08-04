import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { getCurrencyData } from "@/app/dashboard/currency/actions";
import { redirect } from "next/navigation";
import BuyFleetWizard from "./BuyFleetWizard";
import mongoose from "mongoose";
import FleetStore from "@/lib/models/FleetStore";
import "@/lib/models/FleetBrand";
import Garage from "@/lib/models/Garage";

import dbConnect from "@/lib/mongoose";
export const dynamic = "force-dynamic";

export default async function BuyFleetPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    redirect("/auth/signin");
  }

  const client = await clientPromise;
  const db = client.db();

  const user = await db.collection("users").findOne({ discordId: session.user.discordId });
  if (!user) redirect("/auth/signin");

  // Fetch user NC balance
  let balance = 0;
  try {
    const currencyData = await getCurrencyData();
    balance = currencyData.balance;
  } catch (err) {
    console.error("Failed to fetch balance:", err);
  }

  // Ensure mongoose connection for populate
  await dbConnect();

  // Fetch stores and populate brands
  const stores = await FleetStore.find({}).populate("brand").sort({ price: 1 }).lean();

  // Extract unique brands from stores
  const brandsMap = new Map();
  stores.forEach((store: any) => {
    if (store.brand && store.brand._id) {
      brandsMap.set(store.brand._id.toString(), store.brand);
    }
  });
  const brands = Array.from(brandsMap.values());

  const userData = {
    discordId: user.discordId,
    isBooster: user.isBooster === true,
    isNismaraPlus: user.nismaraplus?.status === true,
    balance: balance,
  };

  const userGarage = await Garage.findOne({ discordId: session.user.discordId }).lean();
  let garageData = null;
  if (userGarage) {
    garageData = {
      fleetSlot: userGarage.fleetSlot || 1,
      fleetSlotUsed: userGarage.fleetSlotUsed || 0,
    };
  } else {
    // Default if not initialized
    garageData = {
      fleetSlot: 1,
      fleetSlotUsed: 0,
    };
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-10">
      <BuyFleetWizard 
        user={userData}
        stores={JSON.parse(JSON.stringify(stores))}
        brands={JSON.parse(JSON.stringify(brands))}
        garage={garageData}
      />
    </div>
  );
}
