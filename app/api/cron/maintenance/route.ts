import { NextResponse } from "next/server";
import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import FleetMaintenanceOrder from "@/lib/models/FleetMaintenanceOrder";
import Fleet from "@/lib/models/Fleet";
import "@/lib/models/FleetStore";
import "@/lib/models/User";
import "@/lib/models/FleetBrand";
import User from "@/lib/models/User";
import "@/lib/models/GarageSlot";
import { sendPersonalNotification } from "@/lib/services/NotificationService";

import dbConnect from "@/lib/mongoose";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export const dynamic = "force-dynamic";

// This should be secured via an API key or Vercel cron secret in production
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
      const freedSlotId = order.slotNumber;
      order.slotNumber = null;
      await order.save();

      let slotStillUsable = false;
      let slotGameId = null;
      let slotType = null;

      if (freedSlotId) {
        const garageSlot = await mongoose.model("GarageSlot").findOne({ slotId: freedSlotId });
        if (garageSlot) {
          const newCondition = Math.max(0, garageSlot.condition - 2);
          garageSlot.condition = newCondition;
          garageSlot.status = newCondition > 0 ? "available" : "broken";
          garageSlot.currentOrderId = null;
          garageSlot.fleetId = null;
          await garageSlot.save();

          slotStillUsable = newCondition > 0;
          slotGameId = garageSlot.game_id;
          slotType = garageSlot.type;
        }
      }

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
      
      await sendPersonalNotification(
        order.discordId,
        "Servis Selesai 🔧",
        `Truk/Fleet ID ${fleet?.fleet_number || 'Anda'} telah selesai diservis dan sudah siap beroperasi kembali!`,
        "success",
        `/dashboard/garage/fleet/${fleet?.get("id") || ''}`
      );

      if (DISCORD_BOT_TOKEN && order.discordChannelId) {
        await fetch(`https://discord.com/api/v10/channels/${order.discordChannelId}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
          }
        }).catch(err => console.error("Failed to delete discord channel", err));
      }

      // 2. Check waiting list for the freed slot ONLY if the slot is still usable
      if (slotStillUsable && slotGameId) {
        // We must find a waiting order that matches the game_id of the slot.
        // We have to populate the fleet to check game_id, or we can fetch all waiting, 
        // look up their fleets, and pick the oldest matching one.
        const allWaiting = await FleetMaintenanceOrder.find({ status: "waiting" }).sort({ createdAt: 1 });
        let matchedWaiting = null;
        
        for (const w of allWaiting) {
          const wFleet = await Fleet.findById(w.fleetId);
          if (wFleet) {
            let wGameId = wFleet.game_id.toLowerCase();
            if (wGameId === "1") wGameId = "ets2";
            if (wGameId === "2") wGameId = "ats";
            
            if (wGameId === slotGameId) {
              // Check VIP constraint: if slot is VIP, user must be VIP.
              if (slotType === "vip") {
                const wUser = await User.findOne({ discordId: w.discordId });
                if (wUser?.nismaraplus?.status === true) {
                  matchedWaiting = w;
                  break;
                }
              } else {
                matchedWaiting = w;
                break;
              }
            }
          }
        }

        if (matchedWaiting) {
          matchedWaiting.status = "in_service";
          matchedWaiting.slotNumber = freedSlotId;
          matchedWaiting.maintenanceStartAt = new Date();
          
          const endAt = new Date();
          endAt.setTime(endAt.getTime() + matchedWaiting.serviceDuration * 24 * 60 * 60 * 1000);
          matchedWaiting.maintenanceEndAt = endAt;
          
          await matchedWaiting.save();

          await Fleet.findByIdAndUpdate(matchedWaiting.fleetId, {
            status: "onservice",
            maintenance_start_date: new Date(),
            maintenance_end_date: endAt
          });

          await mongoose.model("GarageSlot").findOneAndUpdate(
            { slotId: freedSlotId },
            { $set: { status: "in_use", currentOrderId: matchedWaiting._id, fleetId: matchedWaiting.fleetId } }
          );

          await sendPersonalNotification(
            matchedWaiting.discordId,
            "Kendaraan Masuk Garasi 🛠️",
            `Kendaraan Anda telah masuk ke Garasi Slot ${freedSlotId} dari daftar tunggu. Estimasi selesai pada ${endAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB.`,
            "info",
            `/dashboard/garage/fleet/${matchedWaiting.fleetId}`
          );

          if (DISCORD_BOT_TOKEN && matchedWaiting.discordChannelId) {
            await fetch(`https://discord.com/api/v10/channels/${matchedWaiting.discordChannelId}/messages`, {
              method: "POST",
              headers: {
                "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                content: `✅ Kendaraan Anda kini masuk ke Garasi Slot ${freedSlotId}. Estimasi selesai pada **${endAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB**.`
              })
            }).catch(console.error);
          }
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
