import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import GalleryGrid from "@/components/gallery/GalleryGrid";
import AchievementSection from "@/components/profile/AchievementSection";
import CollectibleSection from "@/components/profile/CollectibleSection";
import UserBadges from "@/components/icons/UserBadges";
import { notFound } from "next/navigation";
import { getCompanyMembersMap } from "@/lib/trucky";
import {
  Truck,
  MapPin,
  Globe,
  Trophy,
  Activity,
  Package,
  Coins,
  TriangleAlert,
  Medal,
  Gamepad2,
  ExternalLink,
  MessageSquare,
  Heart,
  Grid3X3,
  MonitorPlay,
  ShieldCheck,
  Star,
  Gem,
} from "lucide-react";
import {
  YoutubeIcon,
  FacebookIcon,
  DiscordIcon,
  InstagramIcon,
} from "@/components/icons/SocialMedia";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export const metadata = {
  title: "Profile Detail",
};

export default async function PublicProfilePage(props: {
  params: Promise<{ truckyId: string }>;
}) {
  const { truckyId } = await props.params;
  const client = await clientPromise;
  const db = client.db();
  const GUILD_ID = "863959415702028318";

  const session = await getServerSession(authOptions);
  const isManager =
    session?.user?.role === "manager" || session?.user?.role === "admin";

  // 1. Fetch from MongoDB
  const user = await db.collection("users").findOne({
    $or: [{ truckyId: truckyId }, { truckyId: Number(truckyId) }],
  });

  if (!user) notFound();

  const driverLink = await db.collection("driverlinks").findOne({
    $or: [{ truckyId: truckyId }, { truckyId: Number(truckyId) }],
  });

  if (!driverLink) notFound();
  const userDiscordId = driverLink.userId;

  const loggedInDiscordId = session?.user?.id || session?.user?.discordId;
  const isOwner = loggedInDiscordId === userDiscordId;

  let loggedInUserTruckyId = null;
  if (loggedInDiscordId) {
    const me = await db
      .collection("users")
      .findOne({ discordId: loggedInDiscordId });
    loggedInUserTruckyId = me?.truckyId || null;
  }

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  // Parallel fetches for stats & history
  const [
    currencies,
    points,
    latestJobs,
    userAchievements,
    jobStatsRaw,
    userCollectibles,
  ] = await Promise.all([
    db
      .collection("currencies")
      .findOne({ userId: userDiscordId, guildId: GUILD_ID }),
    db
      .collection("points")
      .findOne({ userId: userDiscordId, guildId: GUILD_ID }),
    db
      .collection("jobhistories")
      .find(
        { guildId: GUILD_ID, truckyId: truckyId, jobStatus: "COMPLETED" },
        { sort: { completedAt: -1 } },
      )
      .limit(3)
      .toArray(),
    db
      .collection("userachievements")
      .aggregate([
        { $match: { truckyId: truckyId.toString() } },
        {
          $lookup: {
            from: "achievements",
            localField: "achievementId",
            foreignField: "_id",
            as: "achievementDetails",
          },
        },
        { $unwind: "$achievementDetails" },
        {
          $group: {
            _id: "$achievementId",
            count: { $sum: 1 },
            lastEarned: { $max: "$createdAt" },
            achievementDetails: { $first: "$achievementDetails" },
          },
        },
        { $sort: { lastEarned: -1 } },
      ])
      .toArray(),
    db
      .collection("jobhistories")
      .aggregate([
        { $match: { truckyId: truckyId.toString(), guildId: GUILD_ID } },
        {
          $group: {
            _id: null,
            totalCompleted: {
              $sum: { $cond: [{ $eq: ["$jobStatus", "COMPLETED"] }, 1, 0] },
            },
            totalCanceled: {
              $sum: { $cond: [{ $eq: ["$jobStatus", "CANCELED"] }, 1, 0] },
            },
            recentDuration: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$jobStatus", "COMPLETED"] },
                      { $gte: ["$completedAt", twoWeeksAgo] },
                    ],
                  },
                  { $ifNull: ["$durationSeconds", 0] },
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray(),
    db
      .collection("collectibles")
      .find({ discordId: userDiscordId })
      .sort({ createdAt: -1 })
      .toArray(),
  ]);

  const jobStats = jobStatsRaw[0] || {
    totalCompleted: 0,
    totalCanceled: 0,
    recentDuration: 0,
  };
  const recentHours = Math.floor(jobStats.recentDuration / 3600);
  const membersMap = await getCompanyMembersMap(35643);
  const member = membersMap[Number(truckyId)];

  // Helper formatting
  const formatNum = (num: number) => num?.toLocaleString("id-ID") || "0";
  const rankColor = member?.rank?.color || "#7e57c2";

  // XP & Level calculations
  const level = user.level || 1;
  const currentXp = user.xp || 0;
  const xpForNextLevel = level * 1000;
  const xpPercentage = Math.min(
    100,
    Math.max(0, Math.round((currentXp / xpForNextLevel) * 100)),
  );

  // Determine Favorite Game based on latest job or default to ETS2
  const favoriteGame =
    latestJobs[0]?.game === "ats"
      ? "American Truck Simulator"
      : "Euro Truck Simulator 2";

  return (
    <main
      className="min-h-screen pt-24 pb-20 relative bg-background bg-fixed bg-cover bg-center overflow-x-hidden"
      style={{
        backgroundImage: user.backgroundUrl
          ? `url(${user.backgroundUrl})`
          : "none",
      }}
    >
      {/* Less aggressive overlay so background is visible */}
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] pointer-events-none z-0" />

      <div className="max-w-6xl mx-auto px-4 relative z-10 mt-4 mb-12">
        {/* --- HEADER SECTION --- */}
        <div className="w-full rounded-t-3xl overflow-hidden relative z-0 shadow-2xl">
          {/* Banner */}
          <div
            className="h-64 md:h-96 w-full relative bg-cover bg-center"
            style={{
              backgroundImage: user.bannerUrl
                ? `url(${user.bannerUrl})`
                : "none",
              backgroundColor: user.bannerUrl
                ? "transparent"
                : `${rankColor}22`,
            }}
          >
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-background/90 to-transparent" />
          </div>
        </div>

        {/* Content Container (Bottom half) directly attached to banner */}
        <div className="bg-background/80 backdrop-blur-xl border border-border/50 border-t-0 rounded-b-3xl px-6 md:px-10 pb-12 pt-0 shadow-2xl relative z-10 mb-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 -mt-10 md:-mt-14 relative z-10 mb-12">
            {/* Avatar */}
            <div className="shrink-0 flex justify-center md:block">
              <div
                className="w-32 h-32 md:w-48 md:h-48 rounded-3xl border-4 md:border-[6px] border-background overflow-hidden shadow-2xl"
                style={{
                  backgroundColor: `${rankColor}11`,
                }}
              >
                <img
                  src={
                    user.image ||
                    member?.avatar_url ||
                    "/placeholder-avatar.png"
                  }
                  alt={user.name || member?.name || "Driver"}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Identity Info */}
            <div className="flex-1 flex flex-col justify-end text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                <div>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tight drop-shadow-md">
                      {user.name || member?.name || "Driver"}
                    </h1>
                    <UserBadges
                      role={user.discordRole}
                      isBooster={user.isBooster === true}
                      isNismaraPlus={user.nismaraplus?.status === true}
                      truckyRank={user.truckyRank}
                      className="w-7 h-7 md:w-9 md:h-9"
                    />
                  </div>
                  <p className="text-muted-foreground font-medium mt-1 md:mt-2 text-sm md:text-base flex items-center justify-center md:justify-start gap-2">
                    <MapPin className="w-4 h-4" />{" "}
                    {member?.language || "Indonesian"}
                  </p>
                </div>

                {/* Level Badge (Steam Style) */}
                <div className="flex flex-col items-center md:items-end">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Level
                  </span>
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center border-[3px] shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                    style={{
                      borderColor: rankColor,
                      color: rankColor,
                      backgroundColor: `${rankColor}22`,
                    }}
                  >
                    <span className="text-xl font-black">{level}</span>
                  </div>
                </div>
              </div>

              {/* Badges / Roles */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                <span
                  className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md border"
                  style={{
                    color: rankColor,
                    borderColor: `${rankColor}55`,
                    backgroundColor: `${rankColor}11`,
                  }}
                >
                  {member?.rank?.name || user.discordRole || "Intern / Driver"}
                </span>
                {user.nismaraplus?.status && (
                  <span className="group relative px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-linear-to-r from-amber-500/20 to-orange-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1 cursor-help">
                    <Star className="w-3 h-3" /> Nismara+
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-black/80 backdrop-blur-sm text-white text-[11px] rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg border border-white/10 font-medium normal-case tracking-normal pointer-events-none">
                      Aktif sejak{" "}
                      {user.nismaraplus.startedAt
                        ? format(
                            new Date(user.nismaraplus.startedAt),
                            "d MMMM yyyy",
                            { locale: localeId },
                          )
                        : "sekarang"}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/80" />
                    </div>
                  </span>
                )}
                {user.isBooster === true && (
                  <span className="group relative px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-fuchsia-500/10 text-fuchsia-500 border border-fuchsia-500/20 flex items-center gap-1 cursor-help">
                    <Gem className="w-3 h-3" /> Server Booster
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-black/80 backdrop-blur-sm text-white text-[11px] rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg border border-white/10 font-medium normal-case tracking-normal pointer-events-none">
                      Discord Server Booster
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black/80" />
                    </div>
                  </span>
                )}
                {user.isDriver && (
                  <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified Driver
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* --- MAIN CONTENT (2 COLUMNS) --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: Gamification & Stats */}
            <div className="lg:col-span-2 space-y-8">
              {/* Game Favorit Showcase (Steam Style) */}
              <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                  <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-bold text-foreground/90 uppercase tracking-widest text-sm">
                    Game Favorit
                  </h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="w-full sm:w-1/3 aspect-video bg-muted rounded-xl overflow-hidden relative border border-border/50 shrink-0 shadow-inner">
                    <img
                      src={
                        latestJobs[0]?.game === "ats"
                          ? "https://images.nismara.my.id/ats.jpg"
                          : "https://images.nismara.my.id/ets.jpg"
                      }
                      alt={favoriteGame}
                      className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white border border-white/10">
                      {latestJobs[0]?.game === "ats" ? "ATS" : "ETS2"}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-2xl font-bold text-foreground mb-1">
                      {favoriteGame}
                    </h3>
                    <div className="flex flex-wrap items-center gap-6 mt-4">
                      <div>
                        <p className="text-3xl font-light text-foreground">
                          {formatNum(member?.total_driven_distance_km || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">
                          KM Driven
                        </p>
                      </div>
                      <div>
                        <p className="text-3xl font-light text-foreground">
                          {formatNum(jobStats.totalCompleted)}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">
                          Selesai
                        </p>
                      </div>
                      <div>
                        <p className="text-3xl font-light text-red-500">
                          {formatNum(jobStats.totalCanceled)}
                        </p>
                        <p className="text-xs text-red-500/70 uppercase tracking-widest font-bold mt-1">
                          Dibatalkan
                        </p>
                      </div>
                    </div>

                    {/* Recent Driving Info */}
                    {recentHours > 0 && (
                      <div className="mt-4 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg w-fit shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]">
                        <p className="text-xs font-bold text-primary flex items-center gap-2">
                          <MonitorPlay className="w-4 h-4" />
                          Telah mengemudi {recentHours} jam (2 minggu terakhir)
                        </p>
                      </div>
                    )}

                    {/* XP Progress */}
                    <div className="mt-6">
                      <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                        <span>Progres XP</span>
                        <span>
                          {formatNum(currentXp)} / {formatNum(xpForNextLevel)}{" "}
                          XP
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-background rounded-full overflow-hidden border border-border/50">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${xpPercentage}%`,
                            backgroundColor: rankColor,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Stats (Nismara Info) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-card/40 backdrop-blur-sm p-5 rounded-2xl border border-border/50 text-center hover:bg-card/60 transition-colors">
                  <Coins className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-xl font-black text-foreground">
                    {formatNum(currencies?.totalNC || 0)}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                    Saldo NC
                  </p>
                </div>
                <div className="bg-card/40 backdrop-blur-sm p-5 rounded-2xl border border-border/50 text-center hover:bg-card/60 transition-colors">
                  <Package className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                  <p className="text-xl font-black text-foreground">
                    {formatNum(member?.total_cargo_mass_t || 0)}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                    Total Kargo (t)
                  </p>
                </div>
                <div className="bg-card/40 backdrop-blur-sm p-5 rounded-2xl border border-border/50 text-center hover:bg-card/60 transition-colors">
                  <Trophy className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-xl font-black text-foreground">
                    {formatNum(userCollectibles.length)}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                    Total Convoy
                  </p>
                </div>
                <div className="bg-card/40 backdrop-blur-sm p-5 rounded-2xl border border-border/50 text-center hover:bg-card/60 transition-colors">
                  <TriangleAlert className="w-6 h-6 mx-auto mb-2 text-red-500" />
                  <p className="text-xl font-black text-foreground">
                    {formatNum(points?.totalPoints || 0)}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">
                    Penalti
                  </p>
                </div>
              </div>

              {/* Aktivitas Terkini (Recent Activity) */}
              <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                  <Activity className="w-5 h-5 text-muted-foreground" />
                  <h2 className="text-lg font-bold text-foreground/90 uppercase tracking-widest text-sm">
                    Aktivitas Terkini
                  </h2>
                </div>

                {latestJobs.length > 0 ? (
                  <div className="space-y-3">
                    {latestJobs.map((job: any) => (
                      <Link
                        href={`/jobs/${job.jobId || job._id.toString()}`}
                        key={job.jobId || job._id.toString()}
                      >
                        <div className="group flex flex-col sm:flex-row items-center gap-6 bg-background/50 border border-border/30 rounded-xl p-5 hover:border-primary/50 transition-colors relative overflow-hidden mb-3">
                          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                          <div className="w-16 h-16 rounded-2xl bg-card border border-border/50 flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                            <Truck className="w-8 h-8 text-primary/70 group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 text-center sm:text-left z-10">
                            <h4 className="font-bold text-foreground mb-1 text-lg line-clamp-1 group-hover:text-primary transition-colors">
                              {job.cargoName || "Unknown Cargo"}
                            </h4>
                            <p className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="font-medium text-foreground/80">
                                {job.sourceCity}
                              </span>
                              <span className="hidden sm:inline text-muted-foreground/50">
                                →
                              </span>
                              <span className="inline sm:hidden text-muted-foreground/50">
                                ↓
                              </span>
                              <span className="font-medium text-foreground/80">
                                {job.destinationCity}
                              </span>
                            </p>
                          </div>
                          <div className="text-center sm:text-right shrink-0 z-10 border-t sm:border-t-0 sm:border-l border-border/30 pt-4 sm:pt-0 sm:pl-6 mt-2 sm:mt-0 w-full sm:w-auto">
                            <p className="text-sm text-muted-foreground mb-1">
                              {job.completedAt
                                ? formatDistanceToNow(
                                    new Date(job.completedAt),
                                    {
                                      addSuffix: true,
                                      locale: localeId,
                                    },
                                  )
                                : "Baru saja"}
                            </p>
                            <p className="font-black text-primary text-xl">
                              +{formatNum(job.nc?.total || job.revenue || 0)} NC
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground bg-background/30 rounded-xl border border-dashed border-border">
                    Belum ada aktivitas pekerjaan yang tercatat.
                  </div>
                )}
              </div>

              {/* Collectibles */}
              <CollectibleSection
                collectibles={JSON.parse(JSON.stringify(userCollectibles))}
              />
            </div>

            {/* RIGHT COLUMN: Info & Socials */}
            <div className="space-y-8">
              {/* Status Online / Basic Info */}
              <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground/90 uppercase tracking-widest text-sm mb-6 border-b border-border/50 pb-4">
                  Informasi Driver
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Bergabung
                    </span>
                    <span className="text-sm font-bold text-foreground bg-background/50 px-2 py-1 rounded border border-border/50">
                      {new Date(
                        member?.created_at || user.createdAt || Date.now(),
                      ).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Role
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {member?.role?.name || user.discordRole || "Member"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      Cuti (Leave)
                    </span>
                    <span
                      className={`text-sm font-bold px-2 py-1 rounded border ${user.isOnLeave ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"}`}
                    >
                      {user.isOnLeave ? "Sedang Cuti" : "Aktif"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Lencana / Badges */}
              <AchievementSection
                userAchievements={JSON.parse(JSON.stringify(userAchievements))}
              />

              {/* Social Links */}
              <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-foreground/90 uppercase tracking-widest text-sm mb-6 border-b border-border/50 pb-4">
                  Koneksi Sosmed
                </h2>
                <div className="space-y-3">
                  {user.social_media?.youtube && (
                    <a
                      href={user.social_media.youtube}
                      target="_blank"
                      className="group flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-lg text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                          <YoutubeIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          YouTube
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-red-500" />
                    </a>
                  )}
                  {user.social_media?.facebook && (
                    <a
                      href={user.social_media.facebook}
                      target="_blank"
                      className="group flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                          <FacebookIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          Facebook
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-500" />
                    </a>
                  )}
                  {user.social_media?.instagram && (
                    <a
                      href={user.social_media.instagram}
                      target="_blank"
                      className="group flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30 hover:bg-pink-500/10 hover:border-pink-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/10 rounded-lg text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                          <InstagramIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          Instagram
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-pink-500" />
                    </a>
                  )}
                  {user.social_media?.world_of_truck && (
                    <a
                      href={user.social_media.world_of_truck}
                      target="_blank"
                      className="group flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/30 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                          <Globe className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          World of Trucks
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-orange-500" />
                    </a>
                  )}
                  {/* Fallback if no socials */}
                  {!user.social_media?.youtube &&
                    !user.social_media?.facebook &&
                    !user.social_media?.instagram &&
                    !user.social_media?.world_of_truck && (
                      <p className="text-sm text-muted-foreground text-center italic py-2">
                        Belum ada sosial media yang ditautkan.
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>

          {/* --- TRUCK SHOWCASE (Instagram Style Gallery) --- */}
          <div className="mt-24 bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                  <Grid3X3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground tracking-tight">
                    Galeri Truk
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Koleksi foto perjalanan dan armada kebanggaan.
                  </p>
                </div>
              </div>

              {/* Navigasi / Filter Mockup */}
              <div className="flex bg-background/50 p-1 rounded-xl border border-border/50 w-fit">
                <button className="px-4 py-1.5 rounded-lg bg-card shadow text-sm font-bold text-foreground border border-border/50">
                  Postingan
                </button>
                <button className="px-4 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground">
                  Tag
                </button>
              </div>
            </div>

            {/* Grid Layout (3 Columns) */}
            <GalleryGrid
              truckyId={truckyId}
              isOwner={isOwner}
              discordId={String(loggedInDiscordId || "")}
              loggedInUserTruckyId={loggedInUserTruckyId}
              profileName={user.name || member?.name || "Pemilik"}
              profileAvatar={
                user.image || member?.avatar_url || "/placeholder-avatar.png"
              }
              profileDiscordId={userDiscordId}
              profileIsNismaraPlus={user.nismaraplus?.status === true}
              profileIsBooster={user.isBooster === true}
              profileRole={user.discordRole || "user"}
              isManager={isManager}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
