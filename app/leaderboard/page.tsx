// app/dashboard/leaderboard/page.tsx
import clientPromise from "@/lib/mongodb";
import { getCompanyMembersMap } from "@/lib/trucky";
import LeaderboardUI from "./LeaderboardUI";
import { redis } from "@/lib/redis";

export const revalidate = 60; // Next.js ISR (opsional karena sudah ada Redis, tapi tetap baik untuk layout cache)

export default async function LeaderboardPage() {
  const cacheKey = "leaderboard:data";
  
  // 1. CEK REDIS
  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return (
        <main className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-1000">
          <LeaderboardUI precalculatedData={JSON.parse(cachedData)} />
        </main>
      );
    }
  } catch (err) {
    console.error("❌ [REDIS] Error reading leaderboard cache:", err);
  }

  // 2. JIKA CACHE MISS, AMBIL DARI MONGODB
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

  // 3. LAKUKAN KALKULASI DI SISI SERVER (BACKEND AGGREGATION)
  const calculateLeaderboard = () => {
    const precalculated: any = { monthly: {}, all: {} };
    const categories = ["nc", "distance", "mass", "jobs", "points"];
    const periods = ["monthly", "all"];

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    periods.forEach((period) => {
      categories.forEach((category) => {
        const aggregates: Record<string, number> = {};

        if (category === "nc") {
          currencies.forEach((tx: any) => {
            const date = new Date(tx.createdAt);
            if (period === "monthly" && date < startOfMonth) return;
            const amount = tx.amount || 0;
            const value = tx.type === "earn" ? amount : -amount;
            aggregates[tx.userId] = (aggregates[tx.userId] || 0) + value;
          });
        } else if (category === "points") {
          points.forEach((p: any) => {
            const date = new Date(p.createdAt);
            if (period === "monthly" && date < startOfMonth) return;
            const val = p.points || 0;
            const value = p.type === "add" ? val : -val;
            aggregates[p.userId] = (aggregates[p.userId] || 0) + value;
          });
        } else {
          jobs.forEach((j: any) => {
            const date = new Date(j.createdAt);
            if (period === "monthly" && date < startOfMonth) return;
            const val =
              category === "distance"
                ? j.distanceKm || 0
                : category === "mass"
                  ? j.cargoMass || 0
                  : 1;
            const id = j.driverId || j.userId;
            aggregates[id] = (aggregates[id] || 0) + val;
          });
        }

        const sorted = Object.entries(aggregates)
          .map(([userId, total]) => ({
            userId,
            total,
            ...(userMap[userId] || {
              name: "Unknown Driver",
              image: null,
              truckyId: "N/A",
            }),
          }))
          .sort((a, b) => {
            if (category === "points") return a.total - b.total;
            return b.total - a.total;
          })
          .slice(0, 10);

        precalculated[period][category] = sorted;
      });
    });

    return precalculated;
  };

  const precalculatedData = calculateLeaderboard();

  // 4. SIMPAN HASIL KALKULASI KE REDIS (TTL 15 Menit = 900 detik)
  try {
    await redis.setex(cacheKey, 900, JSON.stringify(precalculatedData));
  } catch (err) {
    console.error("❌ [REDIS] Error saving leaderboard cache:", err);
  }

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-1000">
      <LeaderboardUI precalculatedData={precalculatedData} />
    </main>
  );
}
