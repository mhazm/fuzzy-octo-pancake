import React from "react";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { Metadata } from "next";
import { Target } from "lucide-react";
import CommunityGoalsTabsClient from "./CommunityGoalsTabsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Community Goals",
  description: "Daftar pencapaian komunitas pengemudi Nismara Transport.",
};

export default async function CommunityGoalsPage() {
  const client = await clientPromise;
  const db = client.db();

  const goals = await db
    .collection("communitygoals")
    .find({
      status: { $in: ["active", "completed", "failed"] },
    })
    .sort({ createdAt: -1 })
    .toArray();

  const serializedGoals = goals.map(goal => ({
    _id: goal._id.toString(),
    title: goal.title,
    slug: goal.slug,
    description: goal.description,
    imageUrl: goal.imageUrl,
    type: goal.type,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    status: goal.status,
    deadline: goal.deadline ? goal.deadline.toISOString() : null,
    participants: goal.participants || [],
  }));

  return (
    <main className="min-h-screen pt-32 pb-20 relative bg-background overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 blur-3xl rounded-b-[100%] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-6 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]">
            <Target className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight uppercase">
            Community <span className="text-primary">Goals</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Bersama kita capai target! Kumpulkan KM atau donasikan NC Anda untuk
            membuka hadiah eksklusif bagi seluruh komunitas Nismara Transport.
          </p>
        </div>

        <div className="flex justify-end mb-8">
          <Link
            href="/dashboard/community-goals/create"
            className="px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/5"
          >
            Usulkan Goal Baru
          </Link>
        </div>

        <CommunityGoalsTabsClient goals={serializedGoals} />
      </div>
    </main>
  );
}
