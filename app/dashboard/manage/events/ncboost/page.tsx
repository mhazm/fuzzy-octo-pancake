import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import EventManageUI from "./EventManageUI";

export const metadata = {
  title: "Manage Ncboost",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;



export default async function ManageEventPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "manager") redirect("/dashboard");

  const client = await clientPromise;
  const db = client.db();
  const guildId = process.env.DISCORD_GUILD_ID;

  const [activeEvents, eventHistory] = await Promise.all([
    db.collection("ncevents").find({ guildId, isActive: true }).toArray(),
    db
      .collection("ncevents")
      .find({ guildId, isActive: false })
      .sort({ endAt: -1 })
      .toArray(),
  ]);

  const serialize = (data: any) => JSON.parse(JSON.stringify(data));

  return (
    <EventManageUI
      active={serialize(activeEvents)}
      history={serialize(eventHistory)}
      manager={session.user}
    />
  );
}
