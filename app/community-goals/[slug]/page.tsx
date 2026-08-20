import React from "react";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import GoalDetailClient from "./GoalDetailClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const client = await clientPromise;
  const db = client.db();
  
  try {
    const isObjectId = ObjectId.isValid(resolvedParams.slug);
    const query = isObjectId 
      ? { $or: [{ slug: resolvedParams.slug }, { _id: new ObjectId(resolvedParams.slug) }] }
      : { slug: resolvedParams.slug };
      
    const goal = await db.collection("communitygoals").findOne(query);
    if (!goal) return { title: "Goal Tidak Ditemukan" };
    
    return {
      title: `${goal.title} - Community Goals`,
      description: goal.description,
      openGraph: {
        title: `${goal.title} - Community Goals`,
        description: goal.description,
        images: [goal.imageUrl || "https://images.nismara.my.id/nismara-logo.png"],
      }
    };
  } catch {
    return { title: "Error" };
  }
}

export default async function GoalDetailPage({ params }: any) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  const client = await clientPromise;
  const db = client.db();

  let goal;
  try {
    const isObjectId = ObjectId.isValid(resolvedParams.slug);
    const query = isObjectId 
      ? { $or: [{ slug: resolvedParams.slug }, { _id: new ObjectId(resolvedParams.slug) }] }
      : { slug: resolvedParams.slug };
      
    goal = await db.collection("communitygoals").findOne(query);
  } catch {
    notFound();
  }

  if (!goal) notFound();

  // Get Creator data
  const creator = await db.collection("users").findOne(
    { discordId: goal.creatorId },
    { projection: { name: 1, image: 1, avatarUrl: 1, discordRole: 1, truckyRank: 1, isBooster: 1, nismaraplus: 1, truckyId: 1 } }
  );

  // Get Participants Data
  const participantIds = goal.participants?.map((p: any) => p.discordId) || [];
  const participantUsers = await db.collection("users").find(
    { discordId: { $in: participantIds } },
    { projection: { discordId: 1, name: 1, image: 1, avatarUrl: 1, discordRole: 1, nismaraplus: 1, truckyRank: 1, isBooster: 1, truckyId: 1 } }
  ).toArray();

  const enrichedParticipants = (goal.participants || []).map((p: any) => {
    const u = participantUsers.find((x) => x.discordId === p.discordId);
    return {
      ...p,
      name: u?.name || "Unknown",
      avatarUrl: u?.image || u?.avatarUrl || null,
      discordRole: u?.discordRole || null,
      nismaraplus: u?.nismaraplus || null,
      truckyRank: u?.truckyRank || null,
      isBooster: u?.isBooster || false,
      truckyId: u?.truckyId || null,
    };
  }).sort((a: any, b: any) => b.contributed - a.contributed);

  // Jika type NC, kita butuh saldo user saat ini untuk form donasi
  let userBalance = 0;
  if (session?.user?.discordId && goal.type === "nc") {
    const currency = await db.collection("currencies").findOne({ 
      userId: session.user.discordId, 
      guildId: process.env.DISCORD_GUILD_ID 
    });
    userBalance = currency?.totalNC || 0;
  }

  const serializedGoal = {
    _id: goal._id.toString(),
    title: goal.title,
    description: goal.description,
    imageUrl: goal.imageUrl,
    type: goal.type,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    status: goal.status,
    rewardType: goal.rewardType,
    rewardDetails: goal.rewardDetails,
    achievementRewards: goal.achievementRewards,
    deadline: goal.deadline ? goal.deadline.toISOString() : null,
    createdAt: goal.createdAt ? goal.createdAt.toISOString() : null,
    creator: creator ? {
      name: creator.name,
      avatarUrl: creator.image || creator.avatarUrl,
      role: creator.discordRole,
      isBooster: creator.isBooster,
      nismaraplus: creator.nismaraplus,
      truckyRank: creator.truckyRank,
      truckyId: creator.truckyId,
      discordId: goal.creatorId
    } : { name: "Unknown", discordId: goal.creatorId },
    participants: enrichedParticipants,
  };

  return <GoalDetailClient 
    goal={serializedGoal} 
    userBalance={userBalance} 
    currentUserId={session?.user?.discordId ? String(session.user.discordId) : undefined}
  />;
}
