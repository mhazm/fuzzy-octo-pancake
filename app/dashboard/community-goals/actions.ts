"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import mongoose from "mongoose";
import CommunityGoal from "@/lib/models/CommunityGoal";
import { revalidatePath } from "next/cache";

export async function createCommunityGoal(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.discordId) {
      return { success: false, error: "Unauthorized" };
    }

    const title = formData.get("title") as string;
    const slugInput = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const type = formData.get("type") as string;
    const targetAmountStr = formData.get("targetAmount") as string;
    const deadlineStr = formData.get("deadline") as string;
    const rewardType = formData.get("rewardType") as string;
    
    // Reward details
    const multiplierStr = formData.get("multiplier") as string;
    const couponAmountStr = formData.get("couponAmount") as string;
    const couponType = formData.get("couponType") as string;
    const rewardDurationStr = formData.get("rewardDuration") as string;

    if (!title || !slugInput || !description || !type || !targetAmountStr || !deadlineStr || !rewardType) {
      return { success: false, error: "Mohon isi semua field yang diwajibkan." };
    }

    const targetAmount = Number(targetAmountStr);
    const deadline = new Date(deadlineStr.includes('T') ? `${deadlineStr}+07:00` : deadlineStr);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      return { success: false, error: "Target Amount tidak valid." };
    }
    if (type === "nc" && targetAmount < 200000) {
      return { success: false, error: "Target NC minimal adalah 200.000 NC." };
    }
    if (type === "km" && targetAmount < 50000) {
      return { success: false, error: "Target KM minimal adalah 50.000 KM." };
    }
    if (deadline.getTime() <= Date.now()) {
      return { success: false, error: "Tenggat waktu harus di masa depan." };
    }

    let rewardDetails: any = {};
    const duration = Number(rewardDurationStr);
    if (isNaN(duration) || duration <= 0) {
      return { success: false, error: "Durasi hadiah tidak valid." };
    }

    if (rewardType === "currency-boost") {
      const multiplier = Number(multiplierStr);
      if (isNaN(multiplier) || multiplier <= 0) return { success: false, error: "Multiplier tidak valid." };
      rewardDetails = { multiplier, duration };
    } else if (rewardType === "coupon") {
      const amount = Number(couponAmountStr);
      if (isNaN(amount) || amount <= 0) return { success: false, error: "Jumlah hadiah kupon tidak valid." };
      rewardDetails = { type: couponType || "NC", amount, duration };
    } else if (rewardType === "special-contract") {
      const companyName = formData.get("companyName") as string;
      if (!companyName) return { success: false, error: "Nama perusahaan harus diisi untuk Special Contract." };
      rewardDetails = { companyName, duration };
    }

    await mongoose.connect(process.env.MONGODB_URI as string);

    // Ensure slug is unique
    let slug = slugInput.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const existing = await CommunityGoal.findOne({ slug });
    if (existing) {
      return { success: false, error: "Slug (URL) sudah digunakan oleh goal lain. Silakan ubah sedikit agar unik." };
    }

    // Create Discord Channel via REST API
    let discordChannelId = null;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    const categoryId = process.env.DISCORD_TICKET_CATEGORY_ID;
    const managerRoleId = process.env.DISCORD_MANAGER_ROLE_ID;

    if (botToken && guildId && categoryId && managerRoleId) {
      try {
        const channelName = `review-${title.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 30)}`;
        
        const createChannelRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: channelName,
            type: 0,
            parent_id: categoryId,
            permission_overwrites: [
              {
                id: guildId, // @everyone
                type: 0,
                deny: "1024" // VIEW_CHANNEL
              },
              {
                id: session.user.discordId,
                type: 1, // member
                allow: "1024" // VIEW_CHANNEL
              },
              {
                id: managerRoleId,
                type: 0, // role
                allow: "1024" // VIEW_CHANNEL
              }
            ]
          })
        });

        if (createChannelRes.ok) {
          const channelData = await createChannelRes.json();
          discordChannelId = channelData.id;

          // Send embed to new channel
          const embed = {
            title: "📌 Usulan Community Goal Baru",
            description: `Pengemudi <@${session.user.discordId}> telah mengusulkan Community Goal baru! \nManager <@&${managerRoleId}> harap segera meninjau usulan ini.`,
            color: 3447003, // Blue
            fields: [
              { name: "Judul", value: title, inline: true },
              { name: "Tipe Target", value: type.toUpperCase(), inline: true },
              { name: "Target", value: `${targetAmount.toLocaleString("id-ID")} ${type.toUpperCase()}`, inline: true },
              { name: "Tenggat Waktu", value: `<t:${Math.floor(deadline.getTime()/1000)}:F>`, inline: false },
              { name: "Hadiah Diminta", value: rewardType === "currency-boost" ? `Currency Boost ${rewardDetails.multiplier}x` : rewardType === "coupon" ? `Kupon ${rewardDetails.amount} ${rewardDetails.type}` : `Special Contract: ${rewardDetails.companyName}`, inline: false }
            ],
            timestamp: new Date().toISOString(),
          };

          await fetch(`https://discord.com/api/v10/channels/${discordChannelId}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bot ${botToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              content: `<@&${managerRoleId}> <@${session.user.discordId}>`, // ping them
              embeds: [embed],
              allowed_mentions: process.env.NODE_ENV === "development" ? { parse: [] } : undefined
            })
          });
        } else {
          console.error("Failed to create discord channel", await createChannelRes.text());
        }
      } catch (err) {
        console.error("Error creating discord channel via bot", err);
      }
    }

    const achParticipantStr = formData.get("achParticipant") as string;
    const achTopContribStr = formData.get("achTopContrib") as string;
    
    let achievementRewards: any = {
      participant: { enabled: false },
      topContributor: { enabled: false }
    };

    if (achParticipantStr) {
      try {
        const ach = JSON.parse(achParticipantStr);
        if (ach.enabled) {
          achievementRewards.participant = {
            enabled: true,
            name: ach.name,
            description: ach.description,
            imageUrl: ach.imageUrl || "https://images.nismara.my.id/nismara-logo.png"
          };
        }
      } catch (e) {}
    }

    if (achTopContribStr) {
      try {
        const ach = JSON.parse(achTopContribStr);
        if (ach.enabled) {
          achievementRewards.topContributor = {
            enabled: true,
            name: ach.name,
            description: ach.description,
            imageUrl: ach.imageUrl || "https://images.nismara.my.id/nismara-logo.png"
          };
        }
      } catch (e) {}
    }

    const newGoal = new CommunityGoal({
      title,
      slug,
      description,
      imageUrl: imageUrl || "https://images.nismara.my.id/nismara-logo.png",
      creatorId: session.user.discordId,
      type,
      targetAmount,
      currentAmount: 0,
      status: "pending",
      rewardType,
      rewardDetails,
      achievementRewards,
      participants: [],
      discordChannelId,
      deadline,
    });

    await newGoal.save();

    revalidatePath("/community-goals");
    revalidatePath("/dashboard/manage/community-goals");

    return { success: true };
  } catch (error: any) {
    console.error("Error creating community goal:", error);
    return { success: false, error: error.message || "Terjadi kesalahan pada server." };
  }
}
