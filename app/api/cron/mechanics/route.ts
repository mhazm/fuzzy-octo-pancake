import { NextResponse } from "next/server";
import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import Garage from "@/lib/models/Garage";
import { MechanicSpecialty } from "@/lib/constants/mechanics";

import dbConnect from "@/lib/mongoose";

export const dynamic = "force-dynamic";

const GUILD_ID = "863959415702028318";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

async function sendDiscordDM(discordId: string, message: string) {
  if (!DISCORD_BOT_TOKEN) return;

  try {
    // Create DM channel
    const dmChannelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ recipient_id: discordId })
    });

    if (!dmChannelRes.ok) {
      console.error("Failed to create DM channel:", await dmChannelRes.text());
      return;
    }

    const dmChannel = await dmChannelRes.json();

    // Send message
    await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content: message })
    });
  } catch (error) {
    console.error("Failed to send Discord DM:", error);
  }
}

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

    // Find all garages (we will filter in JS since checking multiple subdocument dates in Mongo query can be complex, 
    // but ideally we should query where any extendAt is <= now. For simplicity, we just fetch operational garages.)
    const garages = await Garage.find({ status: "operational" });
    
    let processedCount = 0;
    let firedCount = 0;

    for (const garage of garages) {
      if (!garage.mechanics) continue;

      let garageUpdated = false;
      const specialties: MechanicSpecialty[] = ["umum", "ban", "mesin"];

      for (const specialty of specialties) {
        const mechanic = garage.mechanics[specialty];
        if (mechanic && mechanic.extendAt && new Date(mechanic.extendAt) <= now) {
          // Time to pay salary
          const currencyData = await db.collection("currencies").findOne({ userId: garage.discordId, guildId: GUILD_ID });
          
          if (currencyData && currencyData.totalNC >= mechanic.salary) {
            // Can pay: Deduct and extend
            await db.collection("currencies").updateOne(
              { userId: garage.discordId, guildId: GUILD_ID },
              { $inc: { totalNC: -mechanic.salary } }
            );

            await db.collection("currencyhistories").insertOne({
              userId: garage.discordId,
              guildId: GUILD_ID,
              amount: mechanic.salary,
              type: "spend",
              reason: `Weekly Salary for Mechanic ${mechanic.name} (${specialty} Lv.${mechanic.level})`,
              createdAt: new Date(),
            });

            // Extend 7 days
            const nextExtendAt = new Date(mechanic.extendAt);
            nextExtendAt.setDate(nextExtendAt.getDate() + 7);
            
            // If the extended date is still in the past (e.g. cron didn't run for a while), jump to now + 7
            if (nextExtendAt <= now) {
               nextExtendAt.setTime(now.getTime() + (7 * 24 * 60 * 60 * 1000));
            }
            
            mechanic.extendAt = nextExtendAt;
            garageUpdated = true;
            processedCount++;
            
          } else {
            // Cannot pay: Mechanic leaves
            await sendDiscordDM(
              garage.discordId, 
              `⚠️ **Mekanik Pergi!**\nMekanik **${mechanic.name}** (Spesialis ${specialty}) telah pergi dari garasi Anda karena Anda tidak memiliki cukup saldo NC (${mechanic.salary.toLocaleString("id-ID")} NC) untuk membayar gaji mingguannya.`
            );
            
            // Remove mechanic
            garage.mechanics[specialty] = { name: null, level: null, boostPercentage: null, salary: null, extendAt: null };
            garageUpdated = true;
            firedCount++;
          }
        }
      }

      if (garageUpdated) {
        // Mongoose nested objects sometimes need explicit markModified if using mixed types
        // but since we defined schema explicitly, it should save properly. Just in case:
        garage.markModified('mechanics');
        await garage.save();
      }
    }

    return NextResponse.json({ 
      success: true, 
      extendedMechanics: processedCount,
      firedMechanics: firedCount
    });

  } catch (error: any) {
    console.error("Cron Mechanics Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
