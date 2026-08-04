// app/dashboard/leaderboard/page.tsx
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getCompanyMembersMap } from "@/lib/trucky";
import LeaderboardUI from "./LeaderboardUI";

export const revalidate = 120; // Cache halaman ini selama 2 menit (120 detik)

export default async function LeaderboardPage() {
  const client = await clientPromise;
  const db = client.db();
  const guildId = process.env.DISCORD_GUILD_ID;

  const [driverLinks, webUsers, currencies, points, jobs] = await Promise.all([
    db.collection("driverlinks").find({ guildId }).toArray(),
    db.collection("users").find({}).toArray(),
    db.collection("currencyhistories").find({ guildId }).toArray(),
    db.collection("pointhistories").find({ guildId }).toArray(),
    db
      .collection("jobhistories")
      .find({ guildId, jobStatus: "COMPLETED" })
      .toArray(),
  ]);

  const membersMap = await getCompanyMembersMap(35643);

  // BUAT MAPPING OBJECT DI SINI
  const userMap: Record<string, any> = {};

  driverLinks.forEach((link: any) => {
    const webData = webUsers.find((u: any) => u.discordId === link.userId);
    const truckyData = membersMap[link.truckyId] || {};

    userMap[link.userId] = {
      name:
        webData?.name ||
        link.truckyName ||
        truckyData.username ||
        "Unknown Driver",
      image: webData?.image || truckyData.avatar_url || null,
      truckyId: link.truckyId,
    };
  });

  const serialize = (data: any) => JSON.parse(JSON.stringify(data));

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-1000">
      <LeaderboardUI
        currencies={serialize(currencies)}
        points={serialize(points)}
        jobs={serialize(jobs)}
        userMap={serialize(userMap)} // Kirim map data, bukan fungsi
      />
    </main>
  );
}
