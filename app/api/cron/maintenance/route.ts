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
import { revalidatePath } from "next/cache";

import dbConnect from "@/lib/mongoose";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function normalizeGameId(raw: any): "ets2" | "ats" {
  const g = String(raw || "").toLowerCase();
  if (g === "2" || g.includes("ats")) return "ats";
  return "ets2";
}

async function completeOrder(order: any, now: Date) {
  const freedSlotId = order.slotNumber;
  order.status = "completed";
  order.slotNumber = null;
  await order.save();

  const garageSlot = await mongoose.model("GarageSlot").findOne({
    $or: [
      ...(freedSlotId ? [{ slotId: freedSlotId }] : []),
      { currentOrderId: order._id },
    ],
  });

  if (garageSlot) {
    const newCondition = Math.max(0, (garageSlot.condition ?? 100) - 2);
    garageSlot.condition = newCondition;
    garageSlot.status = newCondition > 0 ? "available" : "broken";
    garageSlot.currentOrderId = null;
    garageSlot.fleetId = null;
    await garageSlot.save();
  }

  // Update fleet wear & maintenance thresholds
  const fleet = await Fleet.findById(order.fleetId).populate("model");
  if (fleet) {
    fleet.status = "active";
    fleet.maintenance_start_date = null;
    fleet.maintenance_end_date = null;

    const baseIntervals = {
      engine: 45000,
      tires: 20000,
      transmission: 60000,
      brakes: 35000,
    };

    const currentMaintenance = fleet.maintenance || { ...baseIntervals };
    const wear = fleet.wear || {
      unfix_engine: 0,
      unfix_tires: 0,
      unfix_transmission: 0,
      unfix_brakes: 0,
    };

    const isReplace = order.type === "replace";

    if (order.components?.engine) {
      if (isReplace) wear.unfix_engine = 0;
      currentMaintenance.engine = (fleet.odometer || 0) + baseIntervals.engine;
    }
    if (order.components?.tires) {
      if (isReplace) wear.unfix_tires = 0;
      currentMaintenance.tires = (fleet.odometer || 0) + baseIntervals.tires;
    }
    if (order.components?.transmission) {
      if (isReplace) wear.unfix_transmission = 0;
      currentMaintenance.transmission = (fleet.odometer || 0) + baseIntervals.transmission;
    }
    if (order.components?.brakes) {
      if (isReplace) wear.unfix_brakes = 0;
      currentMaintenance.brakes = (fleet.odometer || 0) + baseIntervals.brakes;
    }

    fleet.maintenance = currentMaintenance;
    fleet.wear = wear;
    await fleet.save();
  }

  sendPersonalNotification(
    order.discordId,
    "Servis Selesai 🔧",
    `Truk/Fleet ${fleet?.fleet_number || "Anda"} telah selesai diservis dan siap beroperasi kembali!`,
    "success",
    `/dashboard/garage/fleet/${fleet?.get("id") || order.fleetId}`,
  ).catch((err) => console.error("Notification Error:", err));

  if (DISCORD_BOT_TOKEN && order.discordChannelId) {
    fetch(`https://discord.com/api/v10/channels/${order.discordChannelId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
      },
    }).catch((err) => console.error("Failed to delete discord channel", err));
  }
}

// 🛡️ RECONCILIATION: Fix any orphaned slots or desynchronized states
async function reconcileGarageSlots(now: Date) {
  const allSlots = await mongoose.model("GarageSlot").find();

  for (const slot of allSlots) {
    if (slot.status === "in_use") {
      if (!slot.currentOrderId) {
        // Orphaned in_use slot with no orderId
        slot.status = "available";
        slot.currentOrderId = null;
        slot.fleetId = null;
        await slot.save();
        continue;
      }

      const linkedOrder = await FleetMaintenanceOrder.findById(slot.currentOrderId);
      if (!linkedOrder || ["completed", "cancelled", "rejected"].includes(linkedOrder.status)) {
        // Order finished or deleted, but slot remained in_use
        slot.status = (slot.condition ?? 100) > 0 ? "available" : "broken";
        slot.currentOrderId = null;
        slot.fleetId = null;
        await slot.save();
        continue;
      }

      if (linkedOrder.status === "in_service" && linkedOrder.maintenanceEndAt && linkedOrder.maintenanceEndAt <= now) {
        // Order completed during reconciliation
        await completeOrder(linkedOrder, now);
        continue;
      }

      if (linkedOrder.status === "waiting") {
        // Order is marked waiting but slot has it as in_use: release slot cleanly so queue promotes correctly
        slot.status = "available";
        slot.currentOrderId = null;
        slot.fleetId = null;
        await slot.save();
        continue;
      }
    } else if (slot.status === "available") {
      // Clean up lingering references on available slots
      if (slot.currentOrderId !== null || slot.fleetId !== null) {
        slot.currentOrderId = null;
        slot.fleetId = null;
        await slot.save();
      }
    }
  }
}

// 🛡️ WAITING QUEUE PROCESSOR: Independently promote waiting orders to available slots
async function processWaitingQueue(now: Date): Promise<number> {
  let promotedCount = 0;

  // Find all available slots with healthy equipment condition
  const availableSlots = await mongoose
    .model("GarageSlot")
    .find({ status: "available", condition: { $gt: 0 } })
    .sort({ slotId: 1 });

  if (availableSlots.length === 0) return 0;

  for (const slot of availableSlots) {
    const allWaiting = await FleetMaintenanceOrder.find({ status: "waiting" }).sort({ createdAt: 1 });
    let matchedWaiting: any = null;

    for (const w of allWaiting) {
      const wFleet = await Fleet.findById(w.fleetId).populate("model");
      if (wFleet) {
        const rawGameId = wFleet.model?.game_id ?? wFleet.game_id;
        const wGameId = normalizeGameId(rawGameId);

        if (wGameId === slot.game_id) {
          if (slot.type === "vip") {
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
      // Atomically claim the slot
      const assignedSlotDoc = await mongoose.model("GarageSlot").findOneAndUpdate(
        { slotId: slot.slotId, status: "available", condition: { $gt: 0 } },
        { $set: { status: "in_use", currentOrderId: matchedWaiting._id, fleetId: matchedWaiting.fleetId } },
        { returnDocument: "after" }
      );

      if (assignedSlotDoc) {
        matchedWaiting.status = "in_service";
        matchedWaiting.slotNumber = slot.slotId;
        matchedWaiting.maintenanceStartAt = now;

        const endAt = new Date(now.getTime() + matchedWaiting.serviceDuration * 24 * 60 * 60 * 1000);
        matchedWaiting.maintenanceEndAt = endAt;
        await matchedWaiting.save();

        const updatedFleet = await Fleet.findByIdAndUpdate(
          matchedWaiting.fleetId,
          {
            status: "onservice",
            maintenance_start_date: now,
            maintenance_end_date: endAt,
          },
          { returnDocument: "after" }
        );

        sendPersonalNotification(
          matchedWaiting.discordId,
          "Kendaraan Masuk Garasi 🛠️",
          `Kendaraan Anda telah masuk ke Garasi Slot ${slot.slotId} dari daftar tunggu. Estimasi selesai pada ${endAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB.`,
          "info",
          `/dashboard/garage/fleet/${updatedFleet?.get("id") || matchedWaiting.fleetId}`,
        ).catch((err) => console.error("Notification Error:", err));

        if (DISCORD_BOT_TOKEN && matchedWaiting.discordChannelId) {
          fetch(`https://discord.com/api/v10/channels/${matchedWaiting.discordChannelId}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `✅ Kendaraan Anda kini masuk ke Garasi Slot ${slot.slotId}. Estimasi selesai pada **${endAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB**.`,
            }),
          }).catch((err) => console.error("Failed to notify discord", err));
        }

        promotedCount++;
      }
    }
  }

  return promotedCount;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const now = new Date();

    // 1. Process all completed maintenance orders
    const completedOrders = await FleetMaintenanceOrder.find({
      status: "in_service",
      maintenanceEndAt: { $lte: now },
    });

    for (const order of completedOrders) {
      await completeOrder(order, now);
    }

    // 2. Reconcile any orphaned/desynchronized slots
    await reconcileGarageSlots(now);

    // 3. Process waiting queue for any available slot
    const promotedCount = await processWaitingQueue(now);

    // 4. Check active fleets for maintenance needs
    const activeFleets = await Fleet.find({ status: "active" }).populate("model");
    let flaggedCount = 0;

    for (const f of activeFleets) {
      const odometer = f.odometer || 0;
      const baseIntervals = {
        engine: 45000,
        tires: 20000,
        transmission: 60000,
        brakes: 35000,
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

        const driverUser = await User.findById(f.driver);
        if (driverUser) {
          sendPersonalNotification(
            driverUser.discordId,
            "Perlu Servis! ⚠️",
            `Kendaraan ${f.fleet_number} membutuhkan servis segera karena telah melewati batas aman penggunaan komponen.`,
            "warning",
            `/dashboard/garage/fleet/${f.get("id") || f._id}`,
          ).catch((err) => console.error("Notification Error:", err));
        }
      }
    }

    // 5. Revalidate cache on dashboard pages
    try {
      revalidatePath("/dashboard/manage/fleet/service");
      revalidatePath("/dashboard/garage/fleet");
    } catch (e) {
      console.error("Failed to revalidate maintenance cron paths", e);
    }

    return NextResponse.json({
      success: true,
      processedOrders: completedOrders.length,
      promotedWaitingOrders: promotedCount,
      flaggedFleets: flaggedCount,
    });
  } catch (error: any) {
    console.error("Cron Maintenance Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
