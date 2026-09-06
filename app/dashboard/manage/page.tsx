import clientPromise from "@/lib/mongodb";
import {
  Users,
  Truck,
  Zap,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Database,
  Coins,
  Activity,
  Ticket,
  Trophy,
  Crown,
  Layers,
  Wrench,
  Radio,
  FileQuestion,
  Headphones,
  Compass,
  ArrowUpRight,
  Sparkles,
  Award,
  Clock,
  Briefcase,
  ChevronRight,
  BarChart3,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { getCompanyMembersMap } from "@/lib/trucky";

export const metadata = {
  title: "Manager Hub",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ManageOverview() {
  const client = await clientPromise;
  const db = client.db();
  const guildId = process.env.DISCORD_GUILD_ID || "863959415702028318";
  const now = new Date();

  // Fetch Data Secara Paralel dengan Query Presisi
  const [
    totalDriverLinks,
    totalCurrencyRecords,
    totalPointsRecords,
    ongoingContractsCount,
    scheduledContractsCount,
    upcomingConvoysCount,
    activeCouponsCount,
    activeGoalsCount,
    activeBoostsCount,
    driversOnLeaveCount,
    nismaraPlusCount,
    internCount,
    openTicketsCount,
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
    db.collection("contracts").countDocuments({ guildId, isActive: true }),
    db.collection("contracts").countDocuments({
      guildId,
      isActive: false,
      isScheduled: true,
      startDate: { $gt: now },
    }),
    db.collection("convoylobby").countDocuments({
      active: { $ne: false },
      isEnded: { $ne: true },
    }),
    db.collection("coupons").countDocuments({
      isActive: { $ne: false },
      endDate: { $gt: now },
    }),
    db.collection("communitygoals").countDocuments({ status: "active" }),
    db.collection("ncevents").countDocuments({ guildId, isActive: true }),
    db.collection("users").countDocuments({ isOnLeave: true }),
    db.collection("users").countDocuments({ "nismaraplus.status": true }),
    db.collection("users").countDocuments({ role: "intern" }),
    db
      .collection("tickets")
      .countDocuments({ status: { $in: ["OPEN", "PENDING", "IN_PROGRESS"] } }),
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
    getCompanyMembersMap(35643).catch(() => ({})),
  ]);

  // Logika Integrity Check
  const currencyMismatch = totalCurrencyRecords !== totalDriverLinks;
  const pointsMismatch = totalPointsRecords !== totalDriverLinks;
  const hasIssue = currencyMismatch || pointsMismatch;

  const membersMapObj = membersMap as Record<string | number, any>;

  const getSPSopir = (min: number, max?: number) => {
    return pointData
      .filter((p) => p.totalPoints >= min && (max ? p.totalPoints < max : true))
      .map((p) => {
        const link = driverLinksData.find((l) => l.userId === p.userId);
        const truckyData = link ? membersMapObj[link.truckyId] : null;
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

  const sp1Drivers = getSPSopir(10, 25);
  const sp2Drivers = getSPSopir(25, 50);
  const sp3Drivers = getSPSopir(50);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 pb-16 animate-in fade-in duration-500">
      {/* 1. EXECUTIVE HERO COMMAND BANNER */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-card via-card/95 to-accent-lilac/10 border border-border p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        {/* Glow Background Spheres */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent-lilac/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
              <Sparkles size={13} /> Operational Command Center • Integrated
              Telemetry
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase">
              Manager{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-lilac via-primary to-accent-sky">
                Hub
              </span>
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
              Pusat komando manajerial Nismara Transport. Pantau integritas
              database, audit operasi logistik spesial, verifikasi penalti, dan
              orkestrasi seluruh armada komunitas.
            </p>
          </div>

          {/* Quick Economy Overview Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-card/90 border border-border px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Coins size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase leading-none">
                  NC Circulation
                </p>
                <p className="text-base md:text-lg font-black text-emerald-400 tabular-nums mt-1">
                  N¢ {totalCirculation[0]?.total?.toLocaleString("id-ID") || 0}
                </p>
              </div>
            </div>

            <div className="bg-card/90 border border-border px-5 py-3.5 rounded-2xl flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase leading-none">
                  Total Penalties
                </p>
                <p className="text-base md:text-lg font-black text-red-400 tabular-nums mt-1">
                  {totalPenaltyPoints[0]?.total?.toLocaleString("id-ID") || 0}{" "}
                  PTS
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SYSTEM INTEGRITY & DATABASE HEALTH BAR */}
      <div
        className={`p-1.5 rounded-[2rem] border transition-all duration-500 shadow-md ${
          hasIssue ? "bg-red-500/10 border-red-500/30" : "bg-card border-border"
        }`}
      >
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-3.5 gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                hasIssue
                  ? "bg-red-500 text-white"
                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              <Database size={16} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Database Health Scan
              </p>
              <p
                className={`text-xs font-black uppercase ${
                  hasIssue ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {hasIssue
                  ? "Data Inconsistency Detected"
                  : "All Systems Nominal (100% Synchronized)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/dashboard/manage/data/nc-data"
              className="flex items-center gap-2 group hover:opacity-80 transition-opacity"
            >
              <span className="text-[10px] font-black uppercase text-muted-foreground">
                Currencies:
              </span>
              <span
                className={`text-xs font-black tabular-nums ${
                  currencyMismatch
                    ? "text-red-400 underline decoration-dotted"
                    : "text-foreground"
                }`}
              >
                {totalCurrencyRecords} / {totalDriverLinks}
              </span>
              <Activity
                size={12}
                className={
                  currencyMismatch ? "text-red-400" : "text-emerald-400"
                }
              />
            </Link>

            <Link
              href="/dashboard/manage/data/point-data"
              className="flex items-center gap-2 group border-l border-border pl-6 hover:opacity-80 transition-opacity"
            >
              <span className="text-[10px] font-black uppercase text-muted-foreground">
                Points:
              </span>
              <span
                className={`text-xs font-black tabular-nums ${
                  pointsMismatch
                    ? "text-red-400 underline decoration-dotted"
                    : "text-foreground"
                }`}
              >
                {totalPointsRecords} / {totalDriverLinks}
              </span>
              <Activity
                size={12}
                className={pointsMismatch ? "text-red-400" : "text-emerald-400"}
              />
            </Link>

            <Link
              href="/dashboard/manage/audit"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary text-[11px] font-black uppercase tracking-wider transition-all shadow-xs border-l pl-5 ml-1"
            >
              <ShieldCheck size={13} />
              Audit Center
            </Link>
          </div>
        </div>
      </div>

      {/* 3. CORE OPERATIONAL KPI METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Special Contracts */}
        <Link
          href="/dashboard/manage/events/contracts"
          className="p-5 rounded-3xl border border-border bg-card hover:border-primary/50 transition-all group flex flex-col justify-between space-y-3 shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Special Contracts
            </span>
            <div className="w-8 h-8 rounded-xl bg-accent-lilac/10 text-accent-lilac flex items-center justify-center group-hover:scale-110 transition-transform">
              <Truck size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {ongoingContractsCount}
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px]">
              <span className="text-emerald-400 font-bold">
                {ongoingContractsCount > 0
                  ? "Live Operating"
                  : "Tidak Ada Kontrak"}
              </span>
              {scheduledContractsCount > 0 && (
                <span className="text-amber-400 font-bold">
                  +{scheduledContractsCount} Antrean
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Metric 2: Convoys */}
        <Link
          href="/dashboard/manage/events/convoy"
          className="p-5 rounded-3xl border border-border bg-card hover:border-primary/50 transition-all group flex flex-col justify-between space-y-3 shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Convoy Lobbies
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Radio size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {upcomingConvoysCount}
            </div>
            <p className="text-[10px] text-sky-400 font-bold mt-1">
              {upcomingConvoysCount > 0
                ? `${upcomingConvoysCount} Jadwal Mendatang`
                : "Belum Ada Jadwal"}
            </p>
          </div>
        </Link>

        {/* Metric 3: Coupons */}
        <Link
          href="/dashboard/manage/events/coupon"
          className="p-5 rounded-3xl border border-border bg-card hover:border-primary/50 transition-all group flex flex-col justify-between space-y-3 shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Active Coupons
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Ticket size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {activeCouponsCount}
            </div>
            <p className="text-[10px] text-amber-400 font-bold mt-1">
              Kupon Siap Klaim
            </p>
          </div>
        </Link>

        {/* Metric 4: Total Driver Roster */}
        <Link
          href="/dashboard/manage/data/users"
          className="p-5 rounded-3xl border border-border bg-card hover:border-primary/50 transition-all group flex flex-col justify-between space-y-3 shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Driver Roster
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {totalDriverLinks}
            </div>
            <p className="text-[10px] text-primary font-bold mt-1">
              Driver Resmi Terhubung
            </p>
          </div>
        </Link>

        {/* Metric 5: Nismara+ Elite */}
        <Link
          href="/dashboard/manage/nismaraplus"
          className="p-5 rounded-3xl border border-border bg-card hover:border-primary/50 transition-all group flex flex-col justify-between space-y-3 shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Nismara+ Elite
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Crown size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-amber-300 tabular-nums">
              {nismaraPlusCount}
            </div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">
              Subscriber Aktif
            </p>
          </div>
        </Link>

        {/* Metric 6: Support Tickets */}
        <Link
          href="/dashboard/manage/tickets"
          className="p-5 rounded-3xl border border-border bg-card hover:border-primary/50 transition-all group flex flex-col justify-between space-y-3 shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Support Tickets
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Headphones size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {openTicketsCount}
            </div>
            <p className="text-[10px] text-red-400 font-bold mt-1">
              {openTicketsCount > 0 ? "Menunggu Respon" : "Tiket Bersih"}
            </p>
          </div>
        </Link>

        {/* Metric 7: Community Goals */}
        <Link
          href="/dashboard/manage/community-goals"
          className="p-5 rounded-3xl border border-border bg-card hover:border-primary/50 transition-all group flex flex-col justify-between space-y-3 shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Community Goals
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Compass size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {activeGoalsCount}
            </div>
            <p className="text-[10px] text-purple-400 font-bold mt-1">
              Target Komunitas Aktif
            </p>
          </div>
        </Link>

        {/* Metric 8: Drivers On Leave */}
        <Link
          href="/dashboard/manage/data"
          className="p-5 rounded-3xl border border-border bg-card hover:border-primary/50 transition-all group flex flex-col justify-between space-y-3 shadow-md hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Drivers On Leave
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar size={16} />
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-foreground tabular-nums">
              {driversOnLeaveCount}
            </div>
            <p className="text-[10px] text-orange-400 font-bold mt-1">
              Pengemudi Izin Cuti
            </p>
          </div>
        </Link>
      </div>

      {/* 4. MANAGEMENT CONSOLE LAUNCHPAD */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
            <Layers className="text-primary" size={20} />
            Management Command Consoles
          </h2>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Direct Control Units
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Domain 1: Operasi & Event */}
          <div className="bg-card border border-border rounded-[2.5rem] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-black uppercase text-accent-lilac tracking-wider flex items-center gap-2">
                <Truck size={15} /> Operasi & Event
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">
                6 Layanan
              </span>
            </div>

            <div className="space-y-2">
              {[
                {
                  name: "Giveaways Engine",
                  href: "/dashboard/manage/giveaways",
                  desc: "Undian hadiah & quest tiket pengemudi",
                },
                {
                  name: "Special Contracts",
                  href: "/dashboard/manage/events/contracts",
                  desc: "Kontrak logistik khusus ETS2 & ATS",
                },
                {
                  name: "Convoy Lobby",
                  href: "/dashboard/manage/events/convoy",
                  desc: "Jadwal & rute konvoi komunitas",
                },
                {
                  name: "Coupon Engine",
                  href: "/dashboard/manage/events/coupon",
                  desc: "Kode kupon hadiah NC & tiket",
                },
                {
                  name: "Community Goals",
                  href: "/dashboard/manage/community-goals",
                  desc: "Target pengiriman bersama",
                },
                {
                  name: "Currency Boost Events",
                  href: "/dashboard/manage/events",
                  desc: "Event pengganda bonus NC",
                },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all group"
                >
                  <div>
                    <p className="text-xs font-black text-foreground uppercase group-hover:text-primary transition-colors">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* Domain 2: Armada & Logistik */}
          <div className="bg-card border border-border rounded-[2.5rem] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-black uppercase text-accent-sky tracking-wider flex items-center gap-2">
                <Wrench size={15} /> Armada & Logistik
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">
                4 Layanan
              </span>
            </div>

            <div className="space-y-2">
              {[
                {
                  name: "Fleet Store",
                  href: "/dashboard/manage/fleet/store",
                  desc: "Katalog unit truk armada Nismara",
                },
                {
                  name: "Fleet Assignment",
                  href: "/dashboard/manage/fleet/assign",
                  desc: "Distribusi truk ke pengemudi",
                },
                {
                  name: "Maintenance & Service",
                  href: "/dashboard/manage/fleet/service",
                  desc: "Perbaikan dan inspeksi kendaraan",
                },
                {
                  name: "Cargo Directory",
                  href: "/dashboard/manage/cargo",
                  desc: "Daftar muatan & tarif pengiriman",
                },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-accent-sky/10 border border-transparent hover:border-accent-sky/30 transition-all group"
                >
                  <div>
                    <p className="text-xs font-black text-foreground uppercase group-hover:text-accent-sky transition-colors">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-muted-foreground group-hover:text-accent-sky group-hover:translate-x-0.5 transition-all"
                  />
                </Link>
              ))}
            </div>
          </div>

          {/* Domain 3: Driver & Komunitas */}
          <div className="bg-card border border-border rounded-[2.5rem] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                <Users size={15} /> Driver & Komunitas
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">
                8 Layanan
              </span>
            </div>

            <div className="space-y-2">
              {[
                {
                  name: "Audit Center & Integrity",
                  href: "/dashboard/manage/audit",
                  desc: "Audit role Discord & bersihkan data orphaned",
                },
                {
                  name: "Manager Payroll & KPI",
                  href: "/dashboard/manage/payroll",
                  desc: "Sistem gaji bulanan & insentif performa",
                },
                {
                  name: "Driver Directory",
                  href: "/dashboard/manage/data/users",
                  desc: "Audit data seluruh pengemudi",
                },
                {
                  name: "Intern Monitor",
                  href: "/dashboard/manage/data/intern",
                  desc: "Pantau kelulusan masa magang",
                },
                {
                  name: "Achievement Registry",
                  href: "/dashboard/manage/data/achievement",
                  desc: "Lencana dan penghargaan driver",
                },
                {
                  name: "Surveys & Polling",
                  href: "/dashboard/manage/surveys",
                  desc: "Kuesioner dan aspirasi anggota",
                },
                {
                  name: "Support Desk (Tickets)",
                  href: "/dashboard/manage/tickets",
                  desc: "Laporan masalah dan bantuan tiket",
                },
                {
                  name: "Season Pass & Quests",
                  href: "/dashboard/manage/season-pass",
                  desc: "Pengaturan musim dan quest berkala",
                },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  href={item.href}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all group"
                >
                  <div>
                    <p className="text-xs font-black text-foreground uppercase group-hover:text-amber-400 transition-colors">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {item.desc}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. WATCHLIST PENALTI (INFRACTION TIERS) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-foreground uppercase flex items-center gap-2">
            <AlertTriangle className="text-red-400" size={20} />
            Driver Infraction Watchlist
          </h2>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Penalty Thresholds
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            {
              title: "SP1 (10-24 PTS)",
              data: sp1Drivers,
              badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
              textColor: "text-orange-400",
            },
            {
              title: "SP2 (25-49 PTS)",
              data: sp2Drivers,
              badge: "bg-orange-600/15 text-orange-500 border-orange-600/30",
              textColor: "text-orange-500",
            },
            {
              title: "SP3 / SUSPENDED (50+ PTS)",
              data: sp3Drivers,
              badge: "bg-red-500/15 text-red-400 border-red-500/30",
              textColor: "text-red-400",
              alert: true,
            },
          ].map((tier, idx) => (
            <div
              key={idx}
              className={`bg-card border border-border rounded-[2.5rem] overflow-hidden flex flex-col shadow-xl ${
                tier.alert ? "border-red-500/30" : ""
              }`}
            >
              <div className="p-6 border-b border-border bg-white/[0.02] flex justify-between items-center">
                <span
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${tier.badge}`}
                >
                  {tier.title}
                </span>
                <span className="text-xs font-black text-muted-foreground">
                  {tier.data.length} Sopir
                </span>
              </div>

              <div className="p-4 space-y-2.5 max-h-[350px] overflow-y-auto custom-scrollbar flex-1">
                {tier.data.map((sopir, sIdx) => (
                  <Link
                    href={`/dashboard/manage/users/${sopir.truckyId}`}
                    key={sIdx}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-transparent hover:border-border transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          sopir.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(sopir.name)}&background=6D28D9&color=fff`
                        }
                        className="w-10 h-10 rounded-full object-cover border border-border"
                        alt={sopir.name}
                      />
                      <div>
                        <p className="text-xs font-black text-foreground uppercase group-hover:text-primary transition-colors leading-none">
                          {sopir.name}
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">
                          #{sopir.truckyId}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-black tabular-nums ${tier.textColor}`}
                    >
                      {sopir.points} PTS
                    </div>
                  </Link>
                ))}

                {tier.data.length === 0 && (
                  <div className="py-14 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                    Sektor Aman • Tidak Ada Pelanggaran
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
