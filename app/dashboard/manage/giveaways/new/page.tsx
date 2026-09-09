import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import GiveawayFormClient from "../GiveawayFormClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Buat Giveaway Baru",
};

export default async function NewGiveawayPage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    !session.user ||
    !["manager", "admin"].includes(
      (session.user as any).discordRole?.toLowerCase() ||
        session.user.role?.toLowerCase() ||
        ""
    )
  ) {
    redirect("/dashboard");
  }

  return <GiveawayFormClient isEdit={false} />;
}
