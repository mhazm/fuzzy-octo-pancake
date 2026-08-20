"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { grantGoalAchievements } from "@/lib/goalAchievements";

export async function donateToGoal(goalId: string, amount: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) return { success: false, error: "Harap login terlebih dahulu." };
    
    if (isNaN(amount) || amount <= 0) return { success: false, error: "Jumlah donasi tidak valid." };

    const client = await clientPromise;
    const db = client.db();
    const guildId = process.env.DISCORD_GUILD_ID;

    // Cek Goal
    const goal = await db.collection("communitygoals").findOne({ _id: new ObjectId(goalId) });
    if (!goal) return { success: false, error: "Goal tidak ditemukan." };
    if (goal.status !== "active") return { success: false, error: "Goal ini sudah tidak aktif." };
    if (goal.type !== "nc") return { success: false, error: "Goal ini bukan target donasi NC." };
    if (new Date(goal.deadline) < new Date()) return { success: false, error: "Waktu partisipasi telah habis." };

    // Cek Balance
    const currency = await db.collection("currencies").findOne({ userId: session.user.discordId, guildId });
    if (!currency || currency.totalNC < amount) {
      return { success: false, error: "Saldo Nismara Coin Anda tidak mencukupi." };
    }

    // 1. Kurangi NC user
    await db.collection("currencies").updateOne(
      { userId: session.user.discordId, guildId },
      { $inc: { totalNC: -amount } }
    );

    // 2. Catat History Currency
    await db.collection("currencyhistories").insertOne({
      userId: session.user.discordId,
      guildId,
      amount,
      type: "spend",
      reason: `Donasi Community Goal: ${goal.title}`,
      createdAt: new Date(),
    });

    // 3. Update Goal (Tambah progress & update partisipan)
    const participantIndex = goal.participants?.findIndex((p: any) => p.discordId === session.user.discordId) ?? -1;
    
    if (participantIndex >= 0) {
      await db.collection("communitygoals").updateOne(
        { _id: new ObjectId(goalId), "participants.discordId": session.user.discordId },
        { 
          $inc: { 
            currentAmount: amount,
            "participants.$.contributed": amount 
          }
        }
      );
    } else {
      await db.collection("communitygoals").updateOne(
        { _id: new ObjectId(goalId) },
        { 
          $inc: { currentAmount: amount },
          $push: { 
            participants: { 
              discordId: session.user.discordId, 
              contributed: amount, 
              joinedAt: new Date() 
            } 
          } as any
        }
      );
    }

    // Cek apakah dengan donasi ini goal tercapai
    const updatedGoal = await db.collection("communitygoals").findOne({ _id: new ObjectId(goalId) });
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const driverRoleId = process.env.DISCORD_DRIVER_ROLE_ID;
    const internRoleId = process.env.DISCORD_INTERN_ROLE_ID;

    if (updatedGoal && botToken && updatedGoal.discordChannelId) {
      if (updatedGoal.currentAmount >= updatedGoal.targetAmount) {
        // Goal Completed
        await db.collection("communitygoals").updateOne(
          { _id: new ObjectId(goalId) },
          { $set: { status: "completed", updatedAt: new Date() } }
        );

        // Lock channel (deny SEND_MESSAGES)
        await fetch(`https://discord.com/api/v10/channels/${updatedGoal.discordChannelId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            permission_overwrites: [
              { id: guildId, type: 0, deny: "1024" }, 
              { id: updatedGoal.creatorId, type: 1, allow: "1024", deny: "2048" }, 
              { id: process.env.DISCORD_MANAGER_ROLE_ID, type: 0, allow: "3072" }, // allow VIEW and SEND
              { id: driverRoleId, type: 0, allow: "1024", deny: "2048" }, 
              { id: internRoleId, type: 0, allow: "1024", deny: "2048" }
            ]
          })
        });

        // Grant Achievements
        const reFetchedGoal = await db.collection("communitygoals").findOne({ _id: new ObjectId(goalId) });
        const grantedAchMsgs = await grantGoalAchievements(reFetchedGoal);
        let achievementDesc = "";
        if (grantedAchMsgs && grantedAchMsgs.length > 0) {
          achievementDesc = "\n\n**🎁 Hadiah Achievement Telah Dibagikan:**\n" + grantedAchMsgs.map(m => `- ${m}`).join("\n");
        }

        const embed = {
          title: "🎉 COMMUNITY GOAL TERCAPAI!",
          description: `Goal **${goal.title}** telah mencapai target berkat donasi komunitas!\nManager akan segera menginformasikan jadwal hadiah event di channel ini.${achievementDesc}`,
          color: 3066993, // Green
          fields: [
            { name: "Total Terkumpul", value: `${updatedGoal.currentAmount.toLocaleString("id-ID")} NC`, inline: true },
            { name: "Target", value: `${updatedGoal.targetAmount.toLocaleString("id-ID")} NC`, inline: true },
            { name: "Hadiah", value: goal.rewardType === "currency-boost" ? `Boost ${goal.rewardDetails?.multiplier}x` : `Kupon ${goal.rewardDetails?.amount} ${goal.rewardDetails?.type}`, inline: false }
          ],
          timestamp: new Date().toISOString(),
        };

        await fetch(`https://discord.com/api/v10/channels/${updatedGoal.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ 
            content: `<@&${driverRoleId}> <@&${process.env.DISCORD_MANAGER_ROLE_ID}>`, 
            embeds: [embed],
            allowed_mentions: process.env.NODE_ENV === "development" ? { parse: [] } : undefined 
          }) 
        });

      } else {
        // Just a progress update
        const progressPercentage = Math.min(100, Math.floor((updatedGoal.currentAmount / updatedGoal.targetAmount) * 100));
        const embed = {
          description: `**<@${session.user.discordId}>** baru saja mendonasikan **${amount.toLocaleString("id-ID")} NC**!`,
          color: 3447003, // Blue
          fields: [
            { name: "Terkumpul", value: `${updatedGoal.currentAmount.toLocaleString("id-ID")} / ${updatedGoal.targetAmount.toLocaleString("id-ID")} NC (${progressPercentage}%)`, inline: true }
          ],
          timestamp: new Date().toISOString(),
        };

        await fetch(`https://discord.com/api/v10/channels/${updatedGoal.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ embeds: [embed] }) 
        });
      }
    }

    revalidatePath(`/community-goals/${goal.slug || goalId}`);
    revalidatePath("/community-goals");
    return { success: true };
  } catch (error: any) {
    console.error("Error donating to goal:", error);
    return { success: false, error: "Terjadi kesalahan server." };
  }
}

export async function optInKmGoal(goalId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) return { success: false, error: "Harap login terlebih dahulu." };
    
    const client = await clientPromise;
    const db = client.db();

    const goal = await db.collection("communitygoals").findOne({ _id: new ObjectId(goalId) });
    if (!goal) return { success: false, error: "Goal tidak ditemukan." };
    if (goal.status !== "active") return { success: false, error: "Goal ini sudah tidak aktif." };
    if (goal.type !== "km") return { success: false, error: "Goal ini bukan target Jarak Tempuh." };
    if (new Date(goal.deadline) < new Date()) return { success: false, error: "Waktu partisipasi telah habis." };

    const isParticipant = goal.participants?.some((p: any) => p.discordId === session.user.discordId);
    if (isParticipant) {
      return { success: false, error: "Anda sudah berpartisipasi dalam Goal ini." };
    }

    await db.collection("communitygoals").updateOne(
      { _id: new ObjectId(goalId) },
      { 
        $push: { 
          participants: { 
            discordId: session.user.discordId, 
            contributed: 0, 
            joinedAt: new Date() 
          } 
        } as any
      }
    );

    revalidatePath(`/community-goals/${goal.slug || goalId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error opting in km goal:", error);
    return { success: false, error: "Terjadi kesalahan server." };
  }
}
