import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import { grantGoalAchievements } from "@/lib/goalAchievements";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const now = new Date();
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const driverRoleId = process.env.DISCORD_DRIVER_ROLE_ID;
    const internRoleId = process.env.DISCORD_INTERN_ROLE_ID;
    const managerRoleId = process.env.DISCORD_MANAGER_ROLE_ID;

    // 1. Sync KM Goals
    const activeKmGoals = await db.collection("communitygoals").find({ 
      status: "active", 
      type: "km" 
    }).toArray();

    for (const goal of activeKmGoals) {
      // Sync from last run OR from when the goal was approved (activatedAt), never before
      const syncFrom = goal.lastJobSyncAt 
        ? new Date(goal.lastJobSyncAt) 
        : goal.activatedAt 
          ? new Date(goal.activatedAt) 
          : new Date(goal.createdAt);
      
      const participantIds = goal.participants?.map((p: any) => p.discordId) || [];
      if (participantIds.length > 0) {
        const jobs = await db.collection("jobhistories").aggregate([
          { 
            $match: { 
              driverId: { $in: participantIds },  // driverId = discordId
              jobStatus: "COMPLETED",
              completedAt: { $gt: syncFrom, $lte: now }
            }
          },
          {
            $group: {
              _id: "$driverId",
              totalKm: { $sum: "$distanceKm" }
            }
          }
        ]).toArray();

        let totalAddedKm = 0;
        
        for (const j of jobs) {
          const km = j.totalKm || 0;
          if (km > 0) {
            totalAddedKm += km;
            await db.collection("communitygoals").updateOne(
              { _id: goal._id, "participants.discordId": j._id },
              { $inc: { "participants.$.contributed": km } }
            );
          }
        }

        if (totalAddedKm > 0) {
          await db.collection("communitygoals").updateOne(
            { _id: goal._id },
            { $inc: { currentAmount: totalAddedKm } }
          );

          if ((goal.currentAmount + totalAddedKm) >= goal.targetAmount) {
             // Goal Completed!
             await db.collection("communitygoals").updateOne(
               { _id: goal._id },
               { $set: { status: "completed", updatedAt: new Date() } }
             );

             if (botToken && goal.discordChannelId) {
                // Lock Channel
                await fetch(`https://discord.com/api/v10/channels/${goal.discordChannelId}`, {
                  method: "PATCH",
                  headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
                  body: JSON.stringify({
                    permission_overwrites: [
                      { id: guildId, type: 0, deny: "1024" }, 
                      { id: goal.creatorId, type: 1, allow: "1024", deny: "2048" }, 
                      { id: managerRoleId, type: 0, allow: "3072" }, // allow VIEW and SEND
                      { id: driverRoleId, type: 0, allow: "1024", deny: "2048" }, 
                      { id: internRoleId, type: 0, allow: "1024", deny: "2048" }
                    ]
                  })
                });

                // Grant Achievements
                const completedGoal = await db.collection("communitygoals").findOne({ _id: goal._id });
                const grantedAchMsgs = await grantGoalAchievements(completedGoal);
                let achievementDesc = "";
                if (grantedAchMsgs && grantedAchMsgs.length > 0) {
                  achievementDesc = "\n\n**🎁 Hadiah Achievement Telah Dibagikan:**\n" + grantedAchMsgs.map(m => `- ${m}`).join("\n");
                }

                const embed = {
                  title: "🎉 COMMUNITY GOAL TERCAPAI!",
                  description: `Goal Jarak Tempuh **${goal.title}** telah mencapai target berkat kerja keras komunitas!\nManager akan segera menginformasikan jadwal hadiah event di channel ini.${achievementDesc}`,
                  color: 3066993, // Green
                  fields: [
                    { name: "Total Terkumpul", value: `${(goal.currentAmount + totalAddedKm).toLocaleString("id-ID")} KM`, inline: true },
                    { name: "Target", value: `${goal.targetAmount.toLocaleString("id-ID")} KM`, inline: true },
                  ],
                  timestamp: new Date().toISOString(),
                };
                await fetch(`https://discord.com/api/v10/channels/${goal.discordChannelId}/messages`, {
                  method: "POST",
                  headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                    content: `<@&${driverRoleId}> <@&${managerRoleId}>`, 
                    embeds: [embed],
                    allowed_mentions: process.env.NODE_ENV === "development" ? { parse: [] } : undefined 
                  })
                }).catch(err => console.error(err));
             }
          } else {
             // Progress Update
             if (botToken && goal.discordChannelId) {
                const newAmount = goal.currentAmount + totalAddedKm;
                const progressPercentage = Math.min(100, Math.floor((newAmount / goal.targetAmount) * 100));
                const embed = {
                  description: `Sinkronisasi sistem mencatat **${totalAddedKm.toLocaleString("id-ID")} KM** tambahan!`,
                  color: 3447003, // Blue
                  fields: [
                    { name: "Terkumpul", value: `${newAmount.toLocaleString("id-ID")} / ${goal.targetAmount.toLocaleString("id-ID")} KM (${progressPercentage}%)`, inline: true }
                  ],
                  timestamp: new Date().toISOString(),
                };
                await fetch(`https://discord.com/api/v10/channels/${goal.discordChannelId}/messages`, {
                  method: "POST",
                  headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ embeds: [embed] })
                }).catch(err => console.error(err));
             }
          }
        }
      }

      // Update lastJobSyncAt
      if (goal.status !== "completed") {
        await db.collection("communitygoals").updateOne(
          { _id: goal._id },
          { $set: { lastJobSyncAt: now, updatedAt: now } }
        );
      }
    }

    // 2. Process Expired Goals (Failed)
    const expiredGoals = await db.collection("communitygoals").find({
      status: "active",
      deadline: { $lt: now }
    }).toArray();

    for (const goal of expiredGoals) {
      if (goal.currentAmount >= goal.targetAmount) continue; // safety check

      await db.collection("communitygoals").updateOne(
        { _id: goal._id },
        { $set: { status: "failed", updatedAt: now } }
      );

      // Refund for NC goals
      if (goal.type === "nc" && goal.participants && goal.participants.length > 0) {
        for (const participant of goal.participants) {
          if (participant.contributed > 0) {
            // Return NC
            await db.collection("currencies").updateOne(
              { userId: participant.discordId, guildId },
              { $inc: { totalNC: participant.contributed } },
              { upsert: true }
            );
            
            // Write History
            await db.collection("currencyhistories").insertOne({
              userId: participant.discordId,
              guildId,
              amount: participant.contributed,
              type: "earn",
              reason: `Refund dari Goal Gagal: ${goal.title}`,
              createdAt: now,
            });
          }
        }
      }

      if (botToken && goal.discordChannelId) {
        // Lock Channel
        await fetch(`https://discord.com/api/v10/channels/${goal.discordChannelId}`, {
          method: "PATCH",
          headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            permission_overwrites: [
              { id: guildId, type: 0, deny: "1024" }, 
              { id: goal.creatorId, type: 1, allow: "1024", deny: "2048" }, 
              { id: managerRoleId, type: 0, allow: "3072" }, 
              { id: driverRoleId, type: 0, allow: "1024", deny: "2048" }, 
              { id: internRoleId, type: 0, allow: "1024", deny: "2048" }
            ]
          })
        });

        const embed = {
          title: "🕰️ WAKTU HABIS: GOAL GAGAL",
          description: `Sayang sekali, **${goal.title}** tidak mencapai target hingga batas waktu.\n${goal.type === "nc" ? "Semua donasi Nismara Coin telah dikembalikan ke saldo masing-masing." : "Usaha yang bagus semuanya, mari coba lagi di target berikutnya!"}`,
          color: 15158332, // Red
          fields: [
            { name: "Total Terkumpul", value: `${goal.currentAmount.toLocaleString("id-ID")} / ${goal.targetAmount.toLocaleString("id-ID")} ${goal.type.toUpperCase()}`, inline: true },
          ],
          timestamp: new Date().toISOString(),
        };
        await fetch(`https://discord.com/api/v10/channels/${goal.discordChannelId}/messages`, {
          method: "POST",
          headers: { "Authorization": `Bot ${botToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ content: `<@&${driverRoleId}>`, embeds: [embed] })
        }).catch(err => console.error(err));
      }
    }

    return NextResponse.json({ success: true, message: "Community goals cron processed." });

  } catch (error: any) {
    console.error("Cron Community Goals Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
