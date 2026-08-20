import mongoose from "mongoose";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import Achievement from "@/lib/models/Achievement";
import UserAchievement from "@/lib/models/UserAchievement";

// Pastikan model sudah terdaftar
let User: any;
try {
  User = mongoose.model("User");
} catch {
  User = require("@/lib/models/User");
}

export async function grantGoalAchievements(goal: any) {
  if (goal.status !== "completed") return [];
  if (!goal.achievementRewards) return [];

  const client = await clientPromise;
  const db = client.db();

  const participants = goal.participants || [];
  if (participants.length === 0) return [];

  // Temukan Top Contributor
  const topContributor = [...participants].sort((a: any, b: any) => b.contributed - a.contributed)[0];
  const participantDiscordIds = participants.map((p: any) => p.discordId);

  // Ambil truckyId untuk semua peserta
  const users = await db.collection("users").find({
    discordId: { $in: participantDiscordIds }
  }, { projection: { discordId: 1, truckyId: 1 } }).toArray();

  const userMap = new Map();
  users.forEach(u => userMap.set(u.discordId, u.truckyId));

  const grantedMessages: string[] = [];

  // Helper function untuk buat atau ambil achievement, lalu grant ke user
  const processAchievement = async (rewardData: any, isTopContrib: boolean) => {
    if (!rewardData || !rewardData.enabled || !rewardData.name) return;

    // Generate codeId jika belum ada, format: "CG_[slug]_PARTICIPANT" atau "CG_[slug]_TOP"
    const codeId = rewardData.codeId || `CG_${goal.slug.toUpperCase().replace(/-/g, '_')}_${isTopContrib ? 'TOP' : 'PARTICIPANT'}`;

    // Buat/ambil master achievement
    let achievement = await Achievement.findOne({ codeId });
    if (!achievement) {
      achievement = await Achievement.create({
        codeId,
        slug: codeId.toLowerCase().replace(/_/g, "-"),
        name: rewardData.name,
        description: rewardData.description || `Diberikan dari Community Goal: ${goal.title}`,
        imageUrl: rewardData.imageUrl || "https://images.nismara.my.id/nismara-logo.png",
        category: "event",
      });
      // Simpan codeId ke goal agar tidak dibuat ulang
      if (isTopContrib) {
        await db.collection("communitygoals").updateOne({ _id: goal._id }, { $set: { "achievementRewards.topContributor.codeId": codeId } });
      } else {
        await db.collection("communitygoals").updateOne({ _id: goal._id }, { $set: { "achievementRewards.participant.codeId": codeId } });
      }
    }

    // Tentukan penerima
    const receivers = isTopContrib ? (topContributor ? [topContributor] : []) : participants;

    // Grant achievement ke penerima
    let grantedCount = 0;
    for (const p of receivers) {
      const truckyId = userMap.get(p.discordId);
      if (!truckyId) continue;

      // Hindari duplikat grant
      const existingGrant = await UserAchievement.findOne({
        discordId: p.discordId,
        achievementId: achievement._id
      });

      if (!existingGrant) {
        await UserAchievement.create({
          discordId: p.discordId,
          truckyId,
          achievementId: achievement._id,
          remarks: `Community Goal: ${goal.title}`
        });
        grantedCount++;
      }
    }

    if (grantedCount > 0) {
      grantedMessages.push(`${isTopContrib ? '🏅 Top Kontributor' : '🎖️ Peserta'}: **${achievement.name}**`);
    }
  };

  // Proses grant (Participant dulu, lalu Top Contributor)
  await processAchievement(goal.achievementRewards.participant, false);
  await processAchievement(goal.achievementRewards.topContributor, true);

  return grantedMessages;
}
