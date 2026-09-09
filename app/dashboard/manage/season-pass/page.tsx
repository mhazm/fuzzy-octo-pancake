import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/mongoose";
import SeasonPass from "@/lib/models/SeasonPass";
import SeasonPassOrder from "@/lib/models/SeasonPassOrder";
import UserSeasonProgress from "@/lib/models/UserSeasonProgress";
import User from "@/lib/models/User";
import { ensureSeasonInitialized, getSeasonPassFeatureStatus } from "@/lib/seasonPass";
import ManageSeasonPassClient from "./ManageSeasonPassClient";

export const metadata = {
  title: "Kelola Seasonal Pass - Manager Portal",
  description: "Pusat manajemen dan konfigurasi musim Nismara Seasonal Pass.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ManageSeasonPassPage() {
  const session = await getServerSession(authOptions);

  const isManager =
    session?.user?.role === "manager" || session?.user?.role === "admin";

  if (!session || !isManager) {
    redirect("/dashboard");
  }

  const isOwner =
    session?.user?.discordId === process.env.OWNER_DISCORD_ID ||
    session?.user?.discordId === process.env.NISMARA_OWNER_DISCORD_ID;

  await dbConnect();
  await ensureSeasonInitialized();

  const seasonsDoc = await SeasonPass.find().sort({ seasonNumber: -1 }).lean();
  const activeSeasonDoc =
    seasonsDoc.find((s) => s.status === "ACTIVE") || seasonsDoc[0];

  const targetSeasonNum = activeSeasonDoc?.seasonNumber || 1;
  const progressListDoc = await UserSeasonProgress.find({
    seasonNumber: targetSeasonNum,
  }).lean();

  const userIds = progressListDoc.map((p) => p.discordId);
  const usersDoc = await User.find({ discordId: { $in: userIds } })
    .select("name image discordId truckyId")
    .lean();

  const userMap = new Map(usersDoc.map((u) => [String(u.discordId), u]));

  const enrichedProgress = progressListDoc.map((p) => ({
    ...p,
    user: userMap.get(String(p.discordId)) || {
      name: "Driver Nismara",
      discordId: p.discordId,
    },
  }));

  // Fetch pending pass orders
  const pendingOrdersDoc = await SeasonPassOrder.find()
    .populate("userId", "name image discordId")
    .sort({ createdAt: -1 })
    .lean();

  const stats = {
    totalDrivers: progressListDoc.length,
    totalPremium: progressListDoc.filter((p) => p.isPremium).length,
    completedCount: progressListDoc.filter((p) => p.currentLevel >= 30).length,
    totalXpEarned: progressListDoc.reduce((acc, p) => acc + (p.currentXp || 0), 0),
    pendingOrdersCount: pendingOrdersDoc.filter((o) => o.status === "pending").length,
  };

  const featureStatusDoc = await getSeasonPassFeatureStatus();

  const seasons = JSON.parse(JSON.stringify(seasonsDoc));
  const activeSeason = JSON.parse(JSON.stringify(activeSeasonDoc));
  const driverProgress = JSON.parse(JSON.stringify(enrichedProgress));
  const orders = JSON.parse(JSON.stringify(pendingOrdersDoc));
  const featureStatus = JSON.parse(JSON.stringify(featureStatusDoc));

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <ManageSeasonPassClient
        initialSeasons={seasons}
        initialActiveSeason={activeSeason}
        initialStats={stats}
        initialDriverProgress={driverProgress}
        initialOrders={orders}
        initialFeatureStatus={featureStatus}
        isOwner={isOwner}
      />
    </div>
  );
}
