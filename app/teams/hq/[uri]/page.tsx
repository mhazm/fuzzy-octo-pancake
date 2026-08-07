import clientPromise from "@/lib/mongodb";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import TeamHQClient from "./TeamHQClient";

export const metadata = {
  title: "Hq Detail",
};



export default async function TeamHQPage({
  params,
}: {
  params: Promise<{ uri: string }>;
}) {
  const { uri } = await params;
  const session = await getServerSession(authOptions);

  // Pastikan Anda mengambil discordId, sesuai dengan konfigurasi NextAuth Anda
  const userId = session?.user?.email;

  if (!userId) {
    redirect("/login");
  }

  const client = await clientPromise;
  const db = client.db();

  const team = await db.collection("teams").findOne({ uri });
  if (!team) return notFound();

  const user = await db
    .collection("users")
    .findOne({ email: session.user?.email });
  if (team.owner.toString() !== user?._id.toString()) redirect(`/teams/${uri}`);

  // Ambil detail member & pending
  const members = await db
    .collection("users")
    .find({ _id: { $in: team.members || [] } })
    .toArray();
  const pending = await db
    .collection("users")
    .find({ _id: { $in: team.pendingRequests || [] } })
    .toArray();

  return (
    <TeamHQClient
      team={JSON.parse(JSON.stringify(team))}
      members={JSON.parse(JSON.stringify(members))}
      pending={JSON.parse(JSON.stringify(pending))}
      isNismaraPlus={user?.nismaraplus?.status === true}
    />
  );
}
