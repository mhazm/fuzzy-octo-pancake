import { NextResponse } from "next/server";
import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import FleetMaintenanceOrder from "@/lib/models/FleetMaintenanceOrder";
import Fleet from "@/lib/models/Fleet";
import "@/lib/models/FleetStore";
import "@/lib/models/User";
import "@/lib/models/FleetBrand";
import User from "@/lib/models/User";
import { sendPersonalNotification } from "@/lib/services/NotificationService";

import dbConnect from "@/lib/mongoose";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

// This should be secured via an API key or Vercel cron secret in production
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const client = await clientPromise;
    const db = client.db();

    const now = new Date();

    // 1. Find completed services
    const completedOrders = await FleetMaintenanceOrder.find({
      status: "in_service",
      maintenanceEndAt: { $lte: now }
    });

    for (const order of completedOrders) {
      // Mark as completed
      order.status = "completed";
      const freedSlot = order.slotNumber;
      order.slotNumber = null;
      await order.save();

      // Update fleet wear & maintenance thresholds
      const fleet = await Fleet.findById(order.fleetId).populate("model");
      if (fleet) {
        fleet.status = "active";
        fleet.maintenance_start_date = null;
        fleet.maintenance_end_date = null;
        
        const baseIntervals = {
          engine: 45000, tires: 20000, transmission: 60000, brakes: 35000
        };

        const currentMaintenance = fleet.maintenance || { ...baseIntervals };
        const wear = fleet.wear || { unfix_engine: 0, unfix_tires: 0, unfix_transmission: 0, unfix_brakes: 0 };

        // If this is a replace order, we reset the wear and the maintenance threshold
        const isReplace = order.type === "replace";

        if (order.components.engine) {
          if (isReplace) wear.unfix_engine = 0;
          currentMaintenance.engine = fleet.odometer + baseIntervals.engine;
        }
        if (order.components.tires) {
          if (isReplace) wear.unfix_tires = 0;
          currentMaintenance.tires = fleet.odometer + baseIntervals.tires;
        }
        if (order.components.transmission) {
          if (isReplace) wear.unfix_transmission = 0;
          currentMaintenance.transmission = fleet.odometer + baseIntervals.transmission;
        }
        if (order.components.brakes) {
          if (isReplace) wear.unfix_brakes = 0;
          currentMaintenance.brakes = fleet.odometer + baseIntervals.brakes;
        }

        fleet.maintenance = currentMaintenance;
        fleet.wear = wear;
        await fleet.save();
      }
      
      // Notifikasi Servis Selesai
      await sendPersonalNotification(
        order.discordId,
        "Servis Selesai 🔧",
        `Truk/Fleet ID ${fleet?.fleet_number || 'Anda'} telah selesai diservis dan sudah siap beroperasi kembali!`,
        "success",
        `/dashboard/garage/fleet/${fleet?.get("id") || ''}`
      );

      // Delete Discord channel
      if (DISCORD_BOT_TOKEN && order.discordChannelId) {
        await fetch(`https://discord.com/api/v10/channels/${order.discordChannelId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
          }
        }).catch(err => console.error("Failed to delete discord channel", err));
      }

      // 2. Check waiting list for the freed slot
      const nextWaiting = await FleetMaintenanceOrder.findOne({ status: "waiting" }).sort({ createdAt: 1 });
      
      if (nextWaiting) {
        nextWaiting.status = "in_service";
        nextWaiting.slotNumber = freedSlot;
        nextWaiting.maintenanceStartAt = new Date();
        
        const endAt = new Date();
        endAt.setDate(endAt.getDate() + nextWaiting.serviceDuration);
        nextWaiting.maintenanceEndAt = endAt;
        
        await nextWaiting.save();

        await Fleet.findByIdAndUpdate(nextWaiting.fleetId, {
          status: "onservice",
          maintenance_start_date: new Date(),
          maintenance_end_date: endAt
        });

        // Notifikasi Masuk Garasi dari Waiting List
        await sendPersonalNotification(
          nextWaiting.discordId,
          "Kendaraan Masuk Garasi 🛠️",
          `Kendaraan Anda telah masuk ke Garasi Slot ${freedSlot} dari daftar tunggu. Estimasi selesai pada ${endAt.toLocaleDateString("id-ID")}.`,
          "info",
          `/dashboard/garage/fleet/${fleet?.get("id") || nextWaiting.fleetId}`
        );

        if (DISCORD_BOT_TOKEN && nextWaiting.discordChannelId) {
          await fetch(`https://discord.com/api/v10/channels/${nextWaiting.discordChannelId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              content: `✅ Kendaraan Anda kini masuk ke Garasi Slot ${freedSlot}. Estimasi selesai pada ${endAt.toLocaleDateString("id-ID")}.`
            })
          }).catch(console.error);
        }
      }
    }

    // 3. Check active fleets for maintenance needs
    const activeFleets = await Fleet.find({ status: "active" }).populate("model");
    let flaggedCount = 0;
    
    for (const f of activeFleets) {
      const odometer = f.odometer || 0;
      const baseIntervals = {
        engine: 45000, tires: 20000, transmission: 60000, brakes: 35000
      };
      const thresholds = f.maintenance || baseIntervals;

      const needsEngine = odometer >= thresholds.engine;
      const needsTires = odometer >= thresholds.tires;
      const needsTransmission = odometer >= thresholds.transmission;
      const needsBrakes = odometer >= thresholds.brakes;

      if (needsEngine || needsTires || needsTransmission || needsBrakes) {
        f.status = "need_maintenance";
        await f.save();
        flaggedCount++;
        
        // Find user to get discordId
        const driverUser = await User.findById(f.driver);
        if (driverUser) {
          await sendPersonalNotification(
            driverUser.discordId,
            "Perlu Servis! ⚠️",
            `Kendaraan ${f.fleet_number} membutuhkan servis segera karena telah melewati batas aman penggunaan komponen.`,
            "warning",
            `/dashboard/garage/fleet/${f.get("id")}`
          );
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      processedOrders: completedOrders.length,
      flaggedFleets: flaggedCount 
    });
  } catch (error: any) {
    console.error("Cron Maintenance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
