// app/dashboard/manage/point-data/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { getCompanyMembersMap } from "@/lib/trucky";
import PointDataUI from "./PointDataUI";
import { AlertTriangle } from "lucide-react";

export default async function PointDataPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "manager") redirect("/dashboard");

  const client = await clientPromise;
  const db = client.db();
  const guildId = process.env.DISCORD_GUILD_ID;

  // 1. Fetch data paralel - Kali ini kita fokus ambil SEMUA points
  const [allPoints, driverLinks, webUsers] = await Promise.all([
    db.collection("points").find({ guildId }).toArray(),
    db.collection("driverlinks").find({ guildId }).toArray(),
    db.collection("users").find({}).toArray(),
  ]);

  const membersMap = await getCompanyMembersMap(35643);

  // 2. Gabungkan Data berdasarkan koleksi POINTS (agar data yatim piatu tetap muncul)
  const combinedPointData = allPoints.map((point) => {
    // Cari link driver berdasarkan Discord ID (userId di points)
    const link = driverLinks.find((l) => l.userId === point.userId);
    const webData = webUsers.find((wu) => wu.discordId === point.userId);
    const truckyData = link ? membersMap[link.truckyId] : null;

    return {
      id: point._id.toString(),
      discordId: point.userId,
      truckyId: link?.truckyId || null, // Jika null, berarti sudah tidak ada di driverlinks
      name:
        webData?.name ||
        link?.truckyName ||
        truckyData?.username ||
        "Unknown Driver (Left VTC)",
      image: webData?.image || truckyData?.avatar_url || null,
      totalPoints: point.totalPoints || 0,
      isOrphaned: !link, // Flag untuk menandai driver yang sudah keluar
    };
  });

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
          <AlertTriangle size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-(-primary-foreground) tracking-tighter uppercase italic leading-none">
            Point Database Audit
          </h1>
          <p className="text-(-primary-foreground)/40 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">
            Nismara Transport • Data Integrity & Cleanup
          </p>
        </div>
      </div>

      <PointDataUI initialData={combinedPointData} />
    </main>
  );
}
