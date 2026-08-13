// app/dashboard/manage/page.tsx
import clientPromise from "@/lib/mongodb";
import {
  Users,
  Truck,
  Zap,
  AlertTriangle,
  Calendar,
  TrendingUp,
  ShieldCheck,
  Database,
  AlertCircle,
  Coins,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { getCompanyMembersMap } from "@/lib/trucky";

export const metadata = {
  title: "Manage",
};



export default async function ManageOverview() {
  const client = await clientPromise;
  const db = client.db();
  const guildId = process.env.DISCORD_GUILD_ID;

  // 1. Fetch Data Secara Paralel
  const [
    totalDriverLinks,
    totalCurrencyRecords,
    totalPointsRecords,
    activeContracts,
    activeBoosts,
    driversOnLeave,
    totalCirculation,
    totalPenaltyPoints,
    pointData,
    allUsers,
    driverLinksData,
    membersMap,
  ] = await Promise.all([
    db.collection("driverlinks").countDocuments({ guildId }),
    db.collection("currencies").countDocuments({ guildId }),
    db.collection("points").countDocuments({ guildId }),
    db.collection("contracts").countDocuments({ guildId }),
    db.collection("ncevents").countDocuments({ guildId }),
    db.collection("users").countDocuments({ isOnLeave: true }),
    db
      .collection("currencies")
      .aggregate([
        { $match: { guildId } },
        { $group: { _id: null, total: { $sum: "$totalNC" } } },
      ])
      .toArray(),
    db
      .collection("points")
      .aggregate([
        { $match: { guildId } },
        { $group: { _id: null, total: { $sum: "$totalPoints" } } },
      ])
      .toArray(),
    db
      .collection("points")
      .find({ guildId, totalPoints: { $gte: 10 } })
      .toArray(),
    db.collection("users").find({}).toArray(),
    db.collection("driverlinks").find({ guildId }).toArray(),
    getCompanyMembersMap(35643),
  ]);

  // Logika Integrity Check
  const currencyMismatch = totalCurrencyRecords !== totalDriverLinks;
  const pointsMismatch = totalPointsRecords !== totalDriverLinks;
  const hasIssue = currencyMismatch || pointsMismatch;

  const getSPSopir = (min: number, max?: number) => {
    return pointData
      .filter((p) => p.totalPoints >= min && (max ? p.totalPoints < max : true))
      .map((p) => {
        const link = driverLinksData.find((l) => l.userId === p.userId);
        const truckyData = link ? membersMap[link.truckyId] : null;
        const webData = allUsers.find((u) => u.discordId === p.userId);
        return {
          name:
            webData?.name ||
            link?.truckyName ||
            truckyData?.username ||
            "Unknown Driver",
          truckyId: link?.truckyId || "N/A",
          image: webData?.image || truckyData?.avatar_url || null,
          points: p.totalPoints,
        };
      });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 pb-10 animate-in fade-in duration-700">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-lilac/10 rounded-lg text-accent-lilac">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-4xl font-black text-(-primary-foreground) tracking-tighter uppercase italic">
              Manager Hub
            </h1>
          </div>
          <p className="text-(-primary-foreground)/40 font-bold uppercase text-[10px] tracking-[0.2em] ml-11">
            Nismara Transport • Operational Command Center
          </p>
        </div>

        {/* STATISTIK EKONOMI CEPAT */}
        <div className="flex gap-3">
          <div className="bg-card border border-border px-5 py-3 rounded-2xl flex items-center gap-3">
            <Coins className="text-emerald-500" size={18} />
            <div>
              <p className="text-[9px] font-black text-foreground/30 uppercase leading-none">
                NC Circulation
              </p>
              <p className="text-lg font-black text-emerald-400 italic">
                N¢ {totalCirculation[0]?.total?.toLocaleString("id-ID") || 0}
              </p>
            </div>
          </div>
          <div className="bg-card border border-border px-5 py-3 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={18} />
            <div>
              <p className="text-[9px] font-black text-foreground/30 uppercase leading-none">
                Total Penalties
              </p>
              <p className="text-lg font-black text-red-500 italic">
                {totalPenaltyPoints[0]?.total || 0} PTS
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SYSTEM INTEGRITY BAR - Diletakkan di sini agar lebih menyatu */}
      <div
        className={`p-1 rounded-[2rem] border transition-all duration-500 ${hasIssue ? "bg-red-500/10 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "bg-white/5 border-white/5"}`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-3 gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${hasIssue ? "bg-red-500 text-white animate-pulse" : "bg-emerald-500 text-white"}`}
            >
              <Database size={16} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-(-primary-foreground)/60">
              Database Health Scan:{" "}
              <span className={hasIssue ? "text-red-500" : "text-emerald-500"}>
                {hasIssue ? "Action Required" : "All Systems Nominal"}
              </span>
            </p>
          </div>

          <div className="flex gap-6">
            <Link
              href="/dashboard/manage/currency-data"
              className="flex items-center gap-2 group"
            >
              <span className="text-[9px] font-black uppercase text-foreground/30">
                Currencies
              </span>
              <span
                className={`text-xs font-black tabular-nums ${currencyMismatch ? "text-red-500 underline decoration-dotted" : "text-foreground/60"}`}
              >
                {totalCurrencyRecords} / {totalDriverLinks}
              </span>
              <Activity
                size={10}
                className={`opacity-0 group-hover:opacity-100 transition-opacity ${currencyMismatch ? "text-red-500" : "text-emerald-500"}`}
              />
            </Link>

            <Link
              href="/dashboard/manage/point-data"
              className="flex items-center gap-2 group border-l border-white/10 pl-6"
            >
              <span className="text-[9px] font-black uppercase text-foreground/30">
                Points
              </span>
              <span
                className={`text-xs font-black tabular-nums ${pointsMismatch ? "text-red-500 underline decoration-dotted" : "text-foreground/60"}`}
              >
                {totalPointsRecords} / {totalDriverLinks}
              </span>
              <Activity
                size={10}
                className={`opacity-0 group-hover:opacity-100 transition-opacity ${pointsMismatch ? "text-red-500" : "text-emerald-500"}`}
              />
            </Link>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Total Drivers",
            value: totalDriverLinks,
            icon: <Users size={24} />,
            color: "from-blue-600/20 to-blue-400/5",
            text: "text-blue-400",
          },
          {
            label: "Active Contracts",
            value: activeContracts,
            icon: <Truck size={24} />,
            color: "from-accent-sky/20 to-sky-400/5",
            text: "text-accent-sky",
          },
          {
            label: "Active Boosts",
            value: activeBoosts,
            icon: <Zap size={24} />,
            color: "from-yellow-600/20 to-yellow-400/5",
            text: "text-yellow-400",
          },
          {
            label: "On Leave",
            value: driversOnLeave,
            icon: <Calendar size={24} />,
            color: "from-orange-600/20 to-orange-400/5",
            text: "text-orange-400",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className={`glass-panel p-8 rounded-[2.5rem] border border-border bg-gradient-to-br ${stat.color} group transition-all hover:scale-[1.02]`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-white/5 ${stat.text}`}>
                {stat.icon}
              </div>
              <TrendingUp size={16} className="opacity-10" />
            </div>
            <p className="text-4xl font-black text-(-primary-foreground) italic tabular-nums">
              {stat.value}
            </p>
            <p className="text-[10px] font-black text-(-primary-foreground)/40 uppercase tracking-widest mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* WATCHLIST PENALTY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          {
            title: "SP1 (10-24 PTS)",
            data: getSPSopir(10, 25),
            color: "border-orange-400/20",
            text: "text-orange-400",
          },
          {
            title: "SP2 (25-49 PTS)",
            data: getSPSopir(25, 50),
            color: "border-orange-600/20",
            text: "text-orange-600",
          },
          {
            title: "SP3 / SUSPENDED",
            data: getSPSopir(50),
            color: "border-red-500/20",
            text: "text-red-500",
            alert: true,
          },
        ].map((tier, idx) => (
          <div
            key={idx}
            className={`glass-panel rounded-[2.5rem] border ${tier.color} overflow-hidden flex flex-col ${tier.alert ? "bg-red-500/5" : ""}`}
          >
            <div className="p-6 border-b border-border bg-white/5 flex justify-between items-center">
              <p
                className={`text-[10px] font-black uppercase tracking-widest ${tier.text}`}
              >
                {tier.title}
              </p>
              <span className="text-xs font-black opacity-40">
                {tier.data.length} Sopir
              </span>
            </div>
            <div className="p-4 space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar flex-1">
              {tier.data.map((sopir, sIdx) => (
                <Link
                  href={`/dashboard/manage/users/${sopir.truckyId}`}
                  key={sIdx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        sopir.image ||
                        `https://ui-avatars.com/api/?name=${sopir.name}&background=6D28D9&color=fff`
                      }
                      className="w-10 h-10 rounded-full object-cover border border-white/10"
                      alt=""
                    />
                    <div>
                      <p className="text-xs font-black text-(-primary-foreground) uppercase leading-none">
                        {sopir.name}
                      </p>
                      <p className="text-[9px] font-bold text-(-primary-foreground)/30 uppercase mt-1">
                        #{sopir.truckyId}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xs font-black italic ${tier.text}`}>
                    {sopir.points} PTS
                  </div>
                </Link>
              ))}
              {tier.data.length === 0 && (
                <div className="py-14 text-center opacity-10 italic text-[10px] font-black uppercase tracking-[0.2em]">
                  Sektor Aman
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
