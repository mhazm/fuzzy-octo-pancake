"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";

export async function updateGoalStatus(goalId: string, newStatus: "active" | "rejected") {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !["manager", "admin"].includes((session.user as any).discordRole?.toLowerCase() || session.user.role?.toLowerCase() || "")) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db();

    const goal = await db.collection("communitygoals").findOne({ _id: new ObjectId(goalId) });
    if (!goal) return { success: false, error: "Goal tidak ditemukan." };

    if (goal.status !== "pending") {
      return { success: false, error: "Goal ini sudah diproses." };
    }

    const activatedAtField = newStatus === "active" ? { activatedAt: new Date() } : {};
    await db.collection("communitygoals").updateOne(
      { _id: new ObjectId(goalId) },
      { $set: { status: newStatus, updatedAt: new Date(), ...activatedAtField } }
    );

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    const driverRoleId = process.env.DISCORD_DRIVER_ROLE_ID;
    const internRoleId = process.env.DISCORD_INTERN_ROLE_ID;
    const categoryId = process.env.DISCORD_COMMUNITY_GOALS_CATEGORY_ID;

    if (goal.discordChannelId && botToken && guildId) {
      if (newStatus === "active") {
        const channelName = `goal-${goal.title.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 30)}`;
        
        // 1. Create a new public channel in the Community Goals Category
        const createRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: channelName,
            type: 0, // text channel
            parent_id: categoryId,
            permission_overwrites: [
              { id: guildId, type: 0, deny: "1024" }, // @everyone deny VIEW_CHANNEL
              { id: process.env.DISCORD_MANAGER_ROLE_ID, type: 0, allow: "1024" },
              { id: driverRoleId, type: 0, allow: "1024" }, // Driver allow
              { id: internRoleId, type: 0, allow: "1024" }  // Intern allow
            ]
          })
        });

        if (createRes.ok) {
          const newChannel = await createRes.json();
          
          // 2. Delete old review channel
          await fetch(`https://discord.com/api/v10/channels/${goal.discordChannelId}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bot ${botToken}`
            }
          });

          // 3. Update DB with new discordChannelId
          await db.collection("communitygoals").updateOne(
            { _id: new ObjectId(goalId) },
            { $set: { discordChannelId: newChannel.id } }
          );

          // 4. Send active embed to the new channel
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://transport.nismara.web.id";
          const embed = {
            title: `🚀 Community Goal Dimulai: ${goal.title}`,
            description: `Usulan Community Goal dari <@${goal.creatorId}> telah **Disetujui** oleh Manager <@${session.user.discordId}>!\nAyo semua driver, bantu selesaikan target ini!`,
            color: 3066993, // Green
            fields: [
              { name: "Target", value: `${goal.targetAmount.toLocaleString("id-ID")} ${goal.type.toUpperCase()}`, inline: true },
              { name: "Tenggat Waktu", value: `<t:${Math.floor(new Date(goal.deadline).getTime()/1000)}:F>`, inline: true },
              { name: "Hadiah Komunitas", value: goal.rewardType === "currency-boost" ? `Currency Boost ${goal.rewardDetails.multiplier}x` : goal.rewardType === "coupon" ? `Kupon ${goal.rewardDetails.amount} ${goal.rewardDetails.type}` : `Special Contract: ${goal.rewardDetails.companyName}`, inline: true },
              { name: "Durasi Hadiah", value: `${goal.rewardDetails.duration || 3} Hari`, inline: true }
            ],
            timestamp: new Date().toISOString(),
          };

          await fetch(`https://discord.com/api/v10/channels/${newChannel.id}/messages`, {
            method: "POST",
            headers: {
              "Authorization": `Bot ${botToken}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
              content: `<@&${driverRoleId}> <@&${internRoleId}>`, 
              embeds: [embed],
              allowed_mentions: process.env.NODE_ENV === "development" ? { parse: [] } : undefined,
              components: [
                {
                  type: 1,
                  components: [
                    {
                      type: 2,
                      style: 5,
                      label: "Mulai Berpartisipasi!",
                      url: `${appUrl}/community-goals/${goal.slug || goalId}`
                    }
                  ]
                }
              ]
            })
          });
        }

      } else if (newStatus === "rejected") {
        const channelName = `rejected-${goal.title.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 25)}`;
        // Update channel name and lock it
        await fetch(`https://discord.com/api/v10/channels/${goal.discordChannelId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: channelName,
            permission_overwrites: [
              { id: guildId, type: 0, deny: "1024" }, 
              { id: goal.creatorId, type: 1, allow: "1024", deny: "2048" }, // allow VIEW, deny SEND_MESSAGES
              { id: process.env.DISCORD_MANAGER_ROLE_ID, type: 0, allow: "1024" }
            ]
          })
        });

        const embed = {
          title: `❌ Usulan Ditolak: ${goal.title}`,
          description: `Mohon maaf <@${goal.creatorId}>, usulan Community Goal ini ditolak oleh Manager <@${session.user.discordId}>.`,
          color: 15158332, // Red
          timestamp: new Date().toISOString(),
        };

        await fetch(`https://discord.com/api/v10/channels/${goal.discordChannelId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bot ${botToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ 
            content: `<@${goal.creatorId}>`, 
            embeds: [embed],
            allowed_mentions: process.env.NODE_ENV === "development" ? { parse: [] } : undefined
          })
        });
      }
    }

    revalidatePath("/dashboard/manage/community-goals");
    revalidatePath("/community-goals");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating goal status:", error);
    return { success: false, error: error.message || "Terjadi kesalahan pada server." };
  }
}

export async function editGoalDetails(goalId: string, payload: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !["manager", "admin"].includes((session.user as any).discordRole?.toLowerCase() || session.user.role?.toLowerCase() || "")) {
      return { success: false, error: "Unauthorized" };
    }

    const client = await clientPromise;
    const db = client.db();

    const goal = await db.collection("communitygoals").findOne({ _id: new ObjectId(goalId) });
    if (!goal) return { success: false, error: "Goal tidak ditemukan." };

    if (payload.slug && payload.slug !== goal.slug) {
      const existing = await db.collection("communitygoals").findOne({ slug: payload.slug });
      if (existing) {
        return { success: false, error: "Slug (URL) sudah digunakan oleh goal lain. Silakan ubah sedikit agar unik." };
      }
    }

    await db.collection("communitygoals").updateOne(
      { _id: new ObjectId(goalId) },
      { $set: { ...payload, updatedAt: new Date() } }
    );

    if (goal.discordChannelId && process.env.DISCORD_BOT_TOKEN) {
      const embed = {
        title: "📝 Usulan Telah Diedit oleh Manager",
        description: `Manager <@${session.user.discordId}> telah menyesuaikan parameter dari usulan ini.`,
        color: 16753920, // Orange
        fields: [
          { name: "Target Baru", value: `${payload.targetAmount.toLocaleString("id-ID")} ${payload.type.toUpperCase()}`, inline: true },
          { name: "Hadiah Baru", value: payload.rewardType === "currency-boost" ? `Currency Boost ${payload.rewardDetails.multiplier}x` : `Kupon ${payload.rewardDetails.amount} ${payload.rewardDetails.type}`, inline: true },
          { name: "Durasi Event/Kupon", value: `${payload.rewardDetails.duration || 3} Hari`, inline: true }
        ],
        timestamp: new Date().toISOString()
      };

      await fetch(`https://discord.com/api/v10/channels/${goal.discordChannelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: `<@${goal.creatorId}>`,
          embeds: [embed],
          allowed_mentions: process.env.NODE_ENV === "development" ? { parse: [] } : undefined
        })
      });
    }

    revalidatePath("/dashboard/manage/community-goals");
    return { success: true };
  } catch (error: any) {
    console.error("Error editing goal details:", error);
    return { success: false, error: error.message || "Terjadi kesalahan pada server." };
  }
}
