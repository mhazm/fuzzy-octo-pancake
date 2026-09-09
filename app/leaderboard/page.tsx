import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  getLeaderboardData,
  getAvailableLeaderboardMonths,
} from "@/lib/leaderboard";
import LeaderboardUI from "./LeaderboardUI";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface PageProps {
  searchParams: Promise<{ category?: string; period?: string }>;
}

export default async function LeaderboardPage(props: PageProps) {
  const resolvedParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const currentDiscordId = session?.user?.discordId
    ? String(session.user.discordId)
    : undefined;

  const availableMonths = await getAvailableLeaderboardMonths();
  const defaultPeriod = resolvedParams?.period || availableMonths[0] || "all";
  const defaultCategory = resolvedParams?.category || "distance";

  const initialData = await getLeaderboardData(
    defaultCategory,
    defaultPeriod,
    currentDiscordId
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      <LeaderboardUI
        initialData={initialData}
        availableMonths={availableMonths}
        currentDiscordId={currentDiscordId}
      />
    </main>
  );
}
