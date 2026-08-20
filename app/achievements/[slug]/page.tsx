import clientPromise from "@/lib/mongodb";
import { notFound } from "next/navigation";
import {
  Medal,
  Trophy,
  Calendar,
  Sparkles,
  ArrowLeft,
  Users,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";
import UserBadges from "@/components/icons/UserBadges";

export const revalidate = 86400; // Cache 24 jam untuk hemat resource

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const client = await clientPromise;
  const db = client.db();

  const achievement = await db.collection("achievements").findOne({ slug });

  if (!achievement) {
    return { title: "Achievement Tidak Ditemukan" };
  }

  return {
    title: `${achievement.name} - Achievement`,
    description: achievement.description,
    openGraph: {
      title: `${achievement.name} - Achievement`,
      description: achievement.description,
      images: [
        achievement.imageUrl || "https://nismara.web.id/img/nismara_bg.png",
      ],
    },
  };
}

export default async function AchievementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await clientPromise;
  const db = client.db();

  const achievement = await db.collection("achievements").findOne({ slug });

  if (!achievement) return notFound();

  // Ambil daftar pemain yang mendapatkan achievement ini
  const players = await db
    .collection("userachievements")
    .aggregate([
      { $match: { achievementId: achievement._id } },
      {
        $group: {
          _id: "$truckyId",
          firstId: { $first: "$_id" },
          count: { $sum: { $ifNull: ["$count", 1] } },
          createdAt: { $min: "$createdAt" },
        },
      },
      {
        $addFields: {
          numericTruckyId: { $toInt: "$_id" },
          truckyId: "$_id", // Restore truckyId field
        },
      },
      {
        $lookup: {
          from: "users",
          let: { tIdString: "$truckyId", tIdNum: "$numericTruckyId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ["$truckyId", "$$tIdString"] },
                    { $eq: ["$truckyId", "$$tIdNum"] },
                  ],
                },
              },
            },
            { $limit: 1 }, // Pastikan hanya ambil 1 akun Discord per truckyId
          ],
          as: "userInfo",
        },
      },
      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: false } },
      { $sort: { createdAt: 1 } }, // Urutkan berdasarkan waktu pertama mendapat
    ])
    .toArray();

  const categoryLabels: Record<string, string> = {
    weekly: "Mingguan",
    monthly: "Bulanan",
    yearly: "Tahunan",
    event: "Event Spesial",
  };

  const catKey = achievement.category || "lainnya";

  return (
    <main className="min-h-screen pt-32 pb-20 relative bg-background overflow-x-hidden">
      {/* Dynamic Background Blur using Image if exists */}
      <div className="absolute top-0 left-0 w-full h-[60vh] pointer-events-none z-0 overflow-hidden">
        {achievement.imageUrl ? (
          <div
            className="absolute -inset-[20%] opacity-15 blur-[100px]"
            style={{
              backgroundImage: `url(${achievement.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ) : (
          <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 blur-3xl rounded-b-[100%]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <Link
          href="/achievements"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>

        {/* Hero Card */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center gap-10 mb-12 relative overflow-hidden group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-xl z-0" />

          <div className="w-40 h-40 md:w-56 md:h-56 shrink-0 bg-background/80 rounded-full border-4 border-background shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)] flex items-center justify-center relative z-10">
            {achievement.imageUrl ? (
              <img
                src={achievement.imageUrl}
                alt={achievement.name}
                className="w-28 h-28 md:w-40 md:h-40 object-contain drop-shadow-xl"
              />
            ) : (
              <Medal className="w-20 h-20 text-primary/50" />
            )}
          </div>

          <div className="flex-1 text-center md:text-left z-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-black uppercase tracking-widest mb-4">
              {categoryLabels[catKey] || catKey}
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-foreground uppercase tracking-tight mb-4 drop-shadow-md">
              {achievement.name}
            </h1>
            <p className="text-muted-foreground md:text-lg leading-relaxed">
              {achievement.description}
            </p>
          </div>
        </div>

        {/* Pemilik / Receivers List */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/50">
            <Users className="w-6 h-6 text-muted-foreground" />
            <h2 className="text-2xl font-black text-foreground uppercase tracking-widest">
              Daftar Pemilik
            </h2>
            <span className="ml-auto bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/20">
              {players.length} Supir
            </span>
          </div>

          {players.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {players.map((p, index) => (
                <div
                  key={p.truckyId}
                  className="relative z-10 hover:z-50 flex items-center justify-between p-4 bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-background border border-border/50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center relative">
                      {p.count > 1 && (
                        <div className="absolute -top-1 -right-1 z-10 text-[9px] bg-primary text-primary-foreground border-2 border-background px-1.5 py-0.5 rounded-full font-black shadow-md">
                          x{p.count}
                        </div>
                      )}
                      <img
                        src={p.userInfo?.image || "/placeholder-avatar.png"}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground flex items-center gap-1.5">
                        <span className="line-clamp-1">{p.userInfo.name}</span>
                        <UserBadges
                          role={p.userInfo.discordRole}
                          isBooster={p.userInfo.isBooster === true}
                          isNismaraPlus={
                            p.userInfo.nismaraplus?.status === true
                          }
                          nismaraPlusStartedAt={
                            p.userInfo.nismaraplus?.startedAt
                          }
                          truckyRank={p.userInfo.truckyRank}
                          className="w-4 h-4"
                        />
                      </h3>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                        {new Date(p.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/profile/${p.truckyId}`}
                    className="p-2 bg-background hover:bg-muted text-muted-foreground hover:text-primary rounded-xl transition-colors border border-border/50"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-card/20 rounded-2xl border border-dashed border-border/50">
              <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground italic font-medium">
                Belum ada supir yang meraih lencana ini.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
