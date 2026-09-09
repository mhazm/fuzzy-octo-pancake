import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import mongoose from "mongoose";
import GarageSlot from "@/lib/models/GarageSlot";
import FleetMaintenanceOrder from "@/lib/models/FleetMaintenanceOrder";
import Fleet from "@/lib/models/Fleet";
import User from "@/lib/models/User";
import { sendPersonalNotification } from "@/lib/services/NotificationService";
import { revalidatePath } from "next/cache";

import dbConnect from "@/lib/mongoose";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

function normalizeGameId(raw: any): "ets2" | "ats" {
  const g = String(raw || "").toLowerCase();
  if (g === "2" || g.includes("ats")) return "ats";
  return "ets2";
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "manager" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slotId } = await request.json();
    if (!slotId) {
      return NextResponse.json({ error: "Slot ID diperlukan" }, { status: 400 });
    }

    await dbConnect();

    // Find the slot
    const slot = await GarageSlot.findOne({ slotId });
    if (!slot) {
      return NextResponse.json({ error: "Slot tidak ditemukan" }, { status: 404 });
    }

    if (slot.condition >= 100 && slot.status !== "broken") {
      return NextResponse.json({ error: "Slot dalam kondisi baik" }, { status: 400 });
    }

    // Repair the slot & clean stale references
    slot.condition = 100;
    slot.status = "available";
    slot.currentOrderId = null;
    slot.fleetId = null;
    await slot.save();

    // Check waiting list to automatically fill the repaired slot
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
      const startAt = new Date();
      const endAt = new Date(startAt.getTime() + matchedWaiting.serviceDuration * 24 * 60 * 60 * 1000);

      matchedWaiting.status = "in_service";
      matchedWaiting.slotNumber = slot.slotId;
      matchedWaiting.maintenanceStartAt = startAt;
      matchedWaiting.maintenanceEndAt = endAt;
      await matchedWaiting.save();

      const updatedFleet = await Fleet.findByIdAndUpdate(matchedWaiting.fleetId, {
        status: "onservice",
        maintenance_start_date: startAt,
        maintenance_end_date: endAt
      }, { returnDocument: "after" });

      slot.status = "in_use";
      slot.currentOrderId = matchedWaiting._id;
      slot.fleetId = matchedWaiting.fleetId;
      await slot.save();

      sendPersonalNotification(
        matchedWaiting.discordId,
        "Kendaraan Masuk Garasi 🛠️",
        `Peralatan Garasi Slot ${slot.slotId} telah diperbaiki. Kendaraan Anda kini masuk ke Garasi dari daftar tunggu. Estimasi selesai pada ${endAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB.`,
        "info",
        `/dashboard/garage/fleet/${updatedFleet?.get("id") || matchedWaiting.fleetId}`
      ).catch((err) => console.error("Notification Error:", err));

      if (DISCORD_BOT_TOKEN && matchedWaiting.discordChannelId) {
        fetch(`https://discord.com/api/v10/channels/${matchedWaiting.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: `✅ Garasi Slot ${slot.slotId} telah diperbaiki oleh tim. Kendaraan Anda kini masuk ke garasi. Estimasi selesai pada **${endAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} WIB**.`
          })
        }).catch(console.error);
      }
    }

    try {
      revalidatePath("/dashboard/manage/fleet/service");
      revalidatePath("/dashboard/garage/fleet");
    } catch (e) {
      console.error("Failed to revalidate garage repair paths", e);
    }

    return NextResponse.json({ success: true, message: "Peralatan garasi berhasil diperbaiki" });
  } catch (error: any) {
    console.error("Repair Slot Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
