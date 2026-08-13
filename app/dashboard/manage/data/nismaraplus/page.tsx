import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import clientPromise from "@/lib/mongodb";
import { redirect } from "next/navigation";
import NismaraPlusManagerClient from "./NismaraPlusManagerClient";

export const metadata = {
  title: "Manage Nismaraplus",
};



export const dynamic = "force-dynamic";

export function Loading() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default async function NismaraPlusManagementPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // Verifikasi role manager dan owner
  const isOwner =
    session.user.discordId === process.env.OWNER_DISCORD_ID ||
    session.user.discordId === process.env.NISMARA_OWNER_DISCORD_ID;

  if (session.user.role !== "manager" || !isOwner) {
    redirect("/dashboard/manage/data");
  }

  const client = await clientPromise;
  const db = client.db();

  // Ambil user yang status premiumnya aktif
  const users = await db
    .collection("users")
    .find({ "nismaraplus.status": true })
    .project({ name: 1, discordId: 1, nismaraplus: 1 })
    .toArray();

  const formattedUsers = users.map((u) => ({
    _id: u._id.toString(),
    discordId: u.discordId,
    name: u.name,
    nismaraplus: {
      status: u.nismaraplus?.status || false,
      startedAt: u.nismaraplus?.startedAt || "",
      expiredAt: u.nismaraplus?.expiredAt || "",
    }
  }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-foreground">
          Manajemen Nismara+
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola data langganan fitur premium driver Nismara.
        </p>
      </div>

      <NismaraPlusManagerClient initialUsers={formattedUsers} />
    </div>
  );
}
