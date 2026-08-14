import type { Metadata } from "next";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Leaderboard Timezone - Nismara Transport",
  description: "Lihat papan peringkat (leaderboard) para pemain TimeZone Nismara Transport. Temukan siapa Sultan terbesar dan siapa yang paling Bangkrut!",
};

export default function TimezoneLeaderboardPage() {
  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-8">
      <LeaderboardClient />
    </div>
  );
}
