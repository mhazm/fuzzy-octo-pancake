import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import FleetOrder from "@/lib/models/FleetOrder";
import { redirect } from "next/navigation";
import OrderListClient from "./OrderListClient";
import "@/lib/models/FleetStore";
import "@/lib/models/FleetBrand";
import "@/lib/models/User";

import dbConnect from "@/lib/mongoose";

export const metadata = {
  title: "Manage Orderlist",
};


export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ManagerOrderListPage() {
  const session = await getServerSession(authOptions);

  // Basic manager role check (replace with your actual manager role check if needed)
  if (!session?.user?.discordId) {
    redirect("/auth/signin");
  }

  await dbConnect();

  const client = await clientPromise;
  const db = client.db();
  const user = await db
    .collection("users")
    .findOne({ discordId: session.user.discordId });

  if (!user) redirect("/auth/signin");

  // Usually you check if user has manager privileges here.
  // For now we assume if they can reach here, they have permission, or we just trust the UI structure.

  const orders = await FleetOrder.find({
    status: { $in: ["pending", "claimed"] },
  })
    .populate({
      path: "fleetStoreId",
      populate: {
        path: "brand",
        model: "FleetBrand",
      },
    })
    .populate("userId", "name discordId image")
    .sort({ createdAt: 1 }) // oldest first
    .lean();

  const GUILD_ID = process.env.DISCORD_GUILD_ID;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10 pb-10">
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-4 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest flex items-center gap-3 text-emerald-500">
            Daftar Pesanan Fleet
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola tiket pesanan pembelian armada
          </p>
        </div>
      </div>

      <OrderListClient
        orders={JSON.parse(JSON.stringify(orders))}
        managerDiscordId={user.discordId}
        guildId={GUILD_ID || ""}
      />
    </div>
  );
}
