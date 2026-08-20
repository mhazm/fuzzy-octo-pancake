import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import ManageGoalsClient from "./ManageGoalsClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage Community Goals",
};

export default async function ManageGoalsPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["manager", "admin"].includes(
      (session.user as any).discordRole?.toLowerCase() ||
        session.user.role?.toLowerCase() ||
        "",
    )
  ) {
    redirect("/dashboard");
  }

  const client = await clientPromise;
  const db = client.db();

  const goals = await db
    .collection("communitygoals")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  // Ambil detail creator
  const creatorIds = [...new Set(goals.map((g) => g.creatorId))];
  const users = await db
    .collection("users")
    .find(
      { discordId: { $in: creatorIds } },
      { projection: { discordId: 1, name: 1, avatarUrl: 1, image: 1 } },
    )
    .toArray();

  const serializedGoals = goals.map((goal) => {
    const creator = users.find((u) => u.discordId === goal.creatorId);
    return {
      _id: goal._id.toString(),
      title: goal.title,
      slug: goal.slug,
      description: goal.description,
      type: goal.type,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      status: goal.status,
      rewardType: goal.rewardType,
      rewardDetails: goal.rewardDetails,
      achievementRewards: goal.achievementRewards,
      deadline: goal.deadline ? goal.deadline.toISOString() : null,
      createdAt: goal.createdAt ? goal.createdAt.toISOString() : null,
      creator: creator
        ? {
            name: creator.name,
            avatarUrl: creator.image || creator.avatarUrl,
          }
        : { name: "Unknown", avatarUrl: null },
    };
  });

  return <ManageGoalsClient goals={serializedGoals} />;
}
