import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import DriverAccessBlocker from "@/components/DriverAccessBlocker";
import dbConnect from "@/lib/mongoose";
import SeasonPassOrder from "@/lib/models/SeasonPassOrder";
import SeasonPassMerchClaim from "@/lib/models/SeasonPassMerchClaim";
import {
  getActiveSeason,
  getLatestSeason,
  getUserSeasonProgress,
  getSeasonWeekInfo,
  getSeasonPassFeatureStatus,
} from "@/lib/seasonPass";
import SeasonPassClient from "./SeasonPassClient";

export const metadata = {
  title: "Nismara Seasonal Pass",
  description:
    "Progresi musim Nismara Pass 30 Level dengan hadiah Nismara Coin, Fuel, Voucher Servis, NC Booster, dan Mod Livery Eksklusif.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function SeasonPassPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.discordId) {
    redirect("/login");
  }

  if (!session.user?.isDriver || !session.user.driverData) {
    return <DriverAccessBlocker session={session} />;
  }

  const featureStatus = await getSeasonPassFeatureStatus();
  const isManager =
    session.user?.role === "manager" || session.user?.role === "admin";

  if (!featureStatus.isEnabled && !isManager) {
    redirect("/dashboard");
  }

  await dbConnect();

  const activeSeasonDoc = await getActiveSeason();
  const latestSeasonDoc = activeSeasonDoc || (await getLatestSeason());

  const seasonNumber = latestSeasonDoc?.seasonNumber || 1;
  const discordId = String(session.user.discordId);

  const progressDoc = await getUserSeasonProgress(discordId, seasonNumber);

  const pendingPassOrderDoc = await SeasonPassOrder.findOne({
    discordId,
    seasonNumber,
    orderType: { $ne: "LEVEL_SKIP" },
    status: "pending",
  }).sort({ createdAt: -1 }).lean();

  const pendingLevelOrderDoc = await SeasonPassOrder.findOne({
    discordId,
    seasonNumber,
    orderType: "LEVEL_SKIP",
    status: "pending",
  }).sort({ createdAt: -1 }).lean();

  const merchClaimDoc = await SeasonPassMerchClaim.findOne({
    discordId,
    seasonNumber,
  }).lean();

  const season = latestSeasonDoc ? JSON.parse(JSON.stringify(latestSeasonDoc)) : null;
  const progress = progressDoc ? JSON.parse(JSON.stringify(progressDoc)) : null;
  const weekInfo = latestSeasonDoc
    ? JSON.parse(
        JSON.stringify(
          getSeasonWeekInfo(latestSeasonDoc, progressDoc?.isPremium || false)
        )
      )
    : null;
  const pendingOrder = pendingPassOrderDoc
    ? JSON.parse(JSON.stringify(pendingPassOrderDoc))
    : null;
  const pendingLevelOrder = pendingLevelOrderDoc
    ? JSON.parse(JSON.stringify(pendingLevelOrderDoc))
    : null;
  const merchClaim = merchClaimDoc
    ? JSON.parse(JSON.stringify(merchClaimDoc))
    : null;
  const guildId = process.env.DISCORD_GUILD_ID || "863959415702028318";

  const isSeasonActive = !!activeSeasonDoc;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      {!featureStatus.isEnabled && isManager && (
        <div className="p-4 md:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <TriangleAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-300">
                Mode Pratinjau Manajer: Fitur Season Pass Sedang Dinonaktifkan
              </p>
              <p className="text-xs text-amber-300/80 mt-0.5">
                {featureStatus.disabledReason
                  ? `Catatan: "${featureStatus.disabledReason}". `
                  : ""}
                Driver biasa tidak dapat mengakses halaman ini dan otomatis dialihkan ke Dashboard. Seluruh menu publik juga disembunyikan.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/manage/season-pass"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all shrink-0 text-center shadow-md shadow-amber-500/20"
          >
            Buka Pengaturan
          </Link>
        </div>
      )}

      <SeasonPassClient
        initialSeason={season}
        initialProgress={progress}
        initialWeekInfo={weekInfo}
        initialPendingOrder={pendingOrder}
        initialPendingLevelOrder={pendingLevelOrder}
        initialMerchClaim={merchClaim}
        guildId={guildId}
        isSeasonActive={isSeasonActive}
      />
    </div>
  );
}
