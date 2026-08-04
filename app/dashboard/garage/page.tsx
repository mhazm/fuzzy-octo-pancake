import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { redirect } from "next/navigation";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import Garage from "@/lib/models/Garage";
import Fleet from "@/lib/models/Fleet";
import mongoose from "mongoose";
import GarageClient from "./GarageClient";
import "@/lib/models/User";

import dbConnect from "@/lib/mongoose";
export const dynamic = "force-dynamic";

export default async function GarageDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.discordId) {
    redirect("/auth/signin");
  }

  await dbConnect();

  const client = await clientPromise;
  const db = client.db();

  const user = await db.collection("users").findOne({ discordId: session.user.discordId });
  if (!user) redirect("/auth/signin");

  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  // Fetch or create Garage
  let garage = await Garage.findOne({ discordId: session.user.discordId });
  
  if (!garage) {
    const nextPaymentDate = new Date();
    nextPaymentDate.setDate(nextPaymentDate.getDate() + 30); // 30 days from now

    garage = await Garage.create({
      userId: user._id.toString(),
      discordId: user.discordId,
      fleetSlot: 1,
      fleetSlotUsed: 0,
      fleetSlotLevel: 1,
      operational_cost: 0, // 1st slot is free
      next_payment_date: nextPaymentDate,
      mechanics: {
        umum: null,
        ban: null,
        mesin: null
      }
    });
  }

  // Calculate fleetSlotUsed
  const userFleetsCount = await Fleet.countDocuments({ driver: user._id.toString() });
  
  if (garage.fleetSlotUsed !== userFleetsCount) {
    garage.fleetSlotUsed = userFleetsCount;
    await garage.save();
  }

  // Convert mongoose doc to plain object for client component
  const garageData = JSON.parse(JSON.stringify(garage));

  return <GarageClient garage={garageData} />;
}
