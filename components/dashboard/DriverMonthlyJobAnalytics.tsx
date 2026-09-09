"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Route,
  TrendingUp,
  Truck,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";

export interface MonthlyJobStatItem {
  month: string; // Format: "YYYY-MM"
  game: "ETS2" | "ATS";
  gameMode: "truckersmp" | "sp";
  totalCompleted: number;
  totalCanceled: number;
  totalDistanceKm: number;
}

interface DriverMonthlyJobAnalyticsProps {
  stats: MonthlyJobStatItem[];
}

const LOGO_ETS2 = "https://images.nismara.my.id/img/euro-truck-simulator-2.png";
const LOGO_ATS = "https://images.nismara.my.id/img/american-truck-simulator.png";

/**
 * Format string "YYYY-MM" menjadi nama bulan berbahasa Indonesia (e.g. "September 2026")
 */
function formatMonthLabel(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [year, month] = monthStr.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export default function DriverMonthlyJobAnalytics({
  stats,
}: DriverMonthlyJobAnalyticsProps) {
  // Ambil daftar seluruh bulan yang unik secara terurut (terbaru di atas)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    stats.forEach((s) => {
      if (s.month) monthsSet.add(s.month);
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [stats]);

  // Default ke bulan terbaru yang ada datanya, atau bulan saat ini (WIB)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (availableMonths.length > 0) return availableMonths[0];
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return currentMonthStr;
  });

  // Mode tampilan: Bulan spesifik atau "ALL" (Semua Waktu)
  const isAllTime = selectedMonth === "ALL";

  // Filter statistik sesuai bulan terpilih
  const activeStats = useMemo(() => {
    if (isAllTime) return stats;
    return stats.filter((s) => s.month === selectedMonth);
  }, [stats, selectedMonth, isAllTime]);

  // Navigasi bulan (Maju / Mundur)
  const currentMonthIndex = availableMonths.indexOf(selectedMonth);
  const handlePrevMonth = () => {
    if (currentMonthIndex < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentMonthIndex + 1]);
    }
  };
  const handleNextMonth = () => {
    if (currentMonthIndex > 0) {
      setSelectedMonth(availableMonths[currentMonthIndex - 1]);
    }
  };

  // Helper kalkulasi metrik untuk subset tertentu
  const calcMetrics = (filtered: MonthlyJobStatItem[]) => {
    let completed = 0;
    let canceled = 0;
    let distance = 0;

    filtered.forEach((item) => {
      completed += item.totalCompleted || 0;
      canceled += item.totalCanceled || 0;
      distance += item.totalDistanceKm || 0;
    });

    const totalJobs = completed + canceled;
    const completionRate = totalJobs > 0 ? (completed / totalJobs) * 100 : 0;

    return {
      completed,
      canceled,
      distance: Math.round(distance),
      totalJobs,
      completionRate: Math.round(completionRate),
    };
  };

  // 1. Total Keseluruhan Bulan Terpilih
  const overallMetrics = useMemo(() => calcMetrics(activeStats), [activeStats]);

  // 2. Statistik Euro Truck Simulator 2 (ETS2)
  const ets2Stats = useMemo(() => {
    const gameFiltered = activeStats.filter((s) => s.game === "ETS2");
    const tmpFiltered = gameFiltered.filter((s) => s.gameMode === "truckersmp");
    const spFiltered = gameFiltered.filter((s) => s.gameMode === "sp");

    return {
      total: calcMetrics(gameFiltered),
      truckersmp: calcMetrics(tmpFiltered),
      sp: calcMetrics(spFiltered),
    };
  }, [activeStats]);

  // 3. Statistik American Truck Simulator (ATS)
  const atsStats = useMemo(() => {
    const gameFiltered = activeStats.filter((s) => s.game === "ATS");
    const tmpFiltered = gameFiltered.filter((s) => s.gameMode === "truckersmp");
    const spFiltered = gameFiltered.filter((s) => s.gameMode === "sp");

    return {
      total: calcMetrics(gameFiltered),
      truckersmp: calcMetrics(tmpFiltered),
      sp: calcMetrics(spFiltered),
    };
  }, [activeStats]);

  // 4. Data Rangkuman Riwayat Multi-Bulan untuk Tabel Komparasi
  const monthlyHistoryRows = useMemo(() => {
    return availableMonths.map((m) => {
      const mStats = stats.filter((s) => s.month === m);
      const ets2 = calcMetrics(mStats.filter((s) => s.game === "ETS2"));
      const ats = calcMetrics(mStats.filter((s) => s.game === "ATS"));
      const total = calcMetrics(mStats);

      return {
        month: m,
        monthLabel: formatMonthLabel(m),
        ets2,
        ats,
        total,
      };
    });
  }, [availableMonths, stats]);

  // Pagination Tabel Riwayat Komparasi (5 periode per halaman)
  const ITEMS_PER_PAGE = 5;
  const [historyPage, setHistoryPage] = useState<number>(1);
  const totalHistoryPages = Math.max(
    1,
    Math.ceil(monthlyHistoryRows.length / ITEMS_PER_PAGE)
  );
  const validHistoryPage = Math.min(historyPage, totalHistoryPages);

  // Otomatis pindah halaman jika user memilih bulan tertentu yang berada di halaman lain
  useEffect(() => {
    if (selectedMonth && selectedMonth !== "ALL") {
      const monthIdx = monthlyHistoryRows.findIndex(
        (r) => r.month === selectedMonth
      );
      if (monthIdx !== -1) {
        const targetPage = Math.floor(monthIdx / ITEMS_PER_PAGE) + 1;
        setHistoryPage(targetPage);
      }
    }
  }, [selectedMonth, monthlyHistoryRows]);

  const paginatedHistoryRows = useMemo(() => {
    const startIndex = (validHistoryPage - 1) * ITEMS_PER_PAGE;
    return monthlyHistoryRows.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [monthlyHistoryRows, validHistoryPage]);

  return (
    <section className="mb-12 mt-12">
      {/* Header Analisis Pekerjaan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <BarChart3 className="text-accent-lilac w-6 h-6" /> Analisis
            Pekerjaan Bulanan
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Statistik pekerjaan selesai, pembatalan, dan jarak tempuh terperinci
            per bulan (ETS2 & ATS).
          </p>
        </div>

        {/* Kontrol Pemilihan Bulan */}
        <div className="flex items-center gap-2 bg-card/60 border border-border/60 p-1.5 rounded-xl shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={
              isAllTime || currentMonthIndex >= availableMonths.length - 1
            }
            aria-label="Bulan Sebelumnya"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold text-foreground px-3 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-lilac rounded-md"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className="bg-card text-foreground">
                  {formatMonthLabel(m)}
                </option>
              ))}
              <option value="ALL" className="bg-card text-foreground font-bold">
                Semua Periode (Akumulasi)
              </option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={isAllTime || currentMonthIndex <= 0}
            aria-label="Bulan Berikutnya"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ringkasan Metrik Kartu Utama (Bulan Terpilih) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Pekerjaan Selesai */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group border-green-500/20">
          <CheckCircle2 className="absolute -bottom-2 -right-2 w-14 h-14 text-green-500/10 group-hover:text-green-500/20 transition-all group-hover:scale-110" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Pekerjaan Selesai
          </p>
          <p className="text-2xl md:text-3xl font-extrabold text-green-400">
            {overallMetrics.completed.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {isAllTime
              ? "Sepanjang riwayat karir"
              : `Periode ${formatMonthLabel(selectedMonth)}`}
          </p>
        </div>

        {/* Pekerjaan Dibatalkan */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group border-red-500/20">
          <XCircle className="absolute -bottom-2 -right-2 w-14 h-14 text-red-500/10 group-hover:text-red-500/20 transition-all group-hover:scale-110" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Dibatalkan
          </p>
          <p className="text-2xl md:text-3xl font-extrabold text-red-400">
            {overallMetrics.canceled.toLocaleString("id-ID")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Tingkat Batal:{" "}
            {overallMetrics.totalJobs > 0
              ? 100 - overallMetrics.completionRate
              : 0}
            %
          </p>
        </div>

        {/* Total Jarak Tempuh */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group border-blue-500/20">
          <Route className="absolute -bottom-2 -right-2 w-14 h-14 text-blue-500/10 group-hover:text-blue-500/20 transition-all group-hover:scale-110" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Jarak Tempuh
          </p>
          <p className="text-2xl md:text-3xl font-extrabold text-blue-400">
            {overallMetrics.distance.toLocaleString("id-ID")}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              Km
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Rata-rata:{" "}
            {overallMetrics.completed > 0
              ? Math.round(
                  overallMetrics.distance / overallMetrics.completed,
                ).toLocaleString("id-ID")
              : 0}{" "}
            Km / job
          </p>
        </div>

        {/* Rasio Keberhasilan (Completion Rate) */}
        <div className="glass-panel p-4 rounded-2xl relative overflow-hidden group border-yellow-500/20">
          <Award className="absolute -bottom-2 -right-2 w-14 h-14 text-yellow-500/10 group-hover:text-yellow-500/20 transition-all group-hover:scale-110" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Rasio Selesai
          </p>
          <p className="text-2xl md:text-3xl font-extrabold text-yellow-400">
            {overallMetrics.completionRate}%
          </p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-500 to-green-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${overallMetrics.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Breakdown 2 Kolom: ETS2 vs ATS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ======================================================== */}
        {/* KARTU 1: EURO TRUCK SIMULATOR 2 (ETS2)                    */}
        {/* ======================================================== */}
        <div className="glass-panel p-6 rounded-2xl border-indigo-500/20 relative overflow-hidden">
          {/* Header Card ETS2 */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-card/90 border border-indigo-500/30 flex items-center justify-center p-1.5 overflow-hidden shadow-inner group-hover:border-indigo-500/50 transition-colors">
                <img
                  src={LOGO_ETS2}
                  alt="Euro Truck Simulator 2 Logo"
                  className="w-full h-full object-contain drop-shadow"
                  loading="lazy"
                />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                  Euro Truck Simulator 2
                </h3>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              {ets2Stats.total.distance.toLocaleString("id-ID")} Km
            </span>
          </div>

          {/* Mini Stats ETS2 */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-card/40 rounded-xl border border-border/40 mb-5">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                Selesai
              </p>
              <p className="text-lg font-bold text-green-400">
                {ets2Stats.total.completed}
              </p>
            </div>
            <div className="text-center border-x border-border/40">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                Batal
              </p>
              <p className="text-lg font-bold text-red-400">
                {ets2Stats.total.canceled}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                Total Jobs
              </p>
              <p className="text-lg font-bold text-foreground">
                {ets2Stats.total.totalJobs}
              </p>
            </div>
          </div>

          {/* Sub-Breakdown: Dimana Bermainnya (TruckersMP vs SP/Convoy) */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Tempat Bermain:
            </p>

            {/* TruckersMP */}
            <div className="p-3.5 rounded-xl bg-card/50 border border-border/50 hover:border-accent-sky/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent-sky/10 text-accent-sky">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      TruckersMP
                    </span>
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-sky/10 text-accent-sky border border-accent-sky/20">
                      Multiplayer
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {ets2Stats.truckersmp.distance.toLocaleString("id-ID")} Km
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Selesai:{" "}
                  <strong className="text-foreground">
                    {ets2Stats.truckersmp.completed}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  Batal:{" "}
                  <strong className="text-foreground">
                    {ets2Stats.truckersmp.canceled}
                  </strong>
                </span>
                <span>
                  Share:{" "}
                  <strong className="text-accent-sky">
                    {ets2Stats.total.distance > 0
                      ? Math.round(
                          (ets2Stats.truckersmp.distance /
                            ets2Stats.total.distance) *
                            100,
                        )
                      : 0}
                    %
                  </strong>
                </span>
              </div>
            </div>

            {/* SinglePlayer / Convoy */}
            <div className="p-3.5 rounded-xl bg-card/50 border border-border/50 hover:border-accent-lilac/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent-lilac/10 text-accent-lilac">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      SinglePlayer / Convoy
                    </span>
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-lilac/10 text-accent-lilac border border-accent-lilac/20">
                      Official Game
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {ets2Stats.sp.distance.toLocaleString("id-ID")} Km
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Selesai:{" "}
                  <strong className="text-foreground">
                    {ets2Stats.sp.completed}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  Batal:{" "}
                  <strong className="text-foreground">
                    {ets2Stats.sp.canceled}
                  </strong>
                </span>
                <span>
                  Share:{" "}
                  <strong className="text-accent-lilac">
                    {ets2Stats.total.distance > 0
                      ? Math.round(
                          (ets2Stats.sp.distance / ets2Stats.total.distance) *
                            100,
                        )
                      : 0}
                    %
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* KARTU 2: AMERICAN TRUCK SIMULATOR (ATS)                  */}
        {/* ======================================================== */}
        <div className="glass-panel p-6 rounded-2xl border-amber-500/20 relative overflow-hidden">
          {/* Header Card ATS */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-card/90 border border-amber-500/30 flex items-center justify-center p-1.5 overflow-hidden shadow-inner group-hover:border-amber-500/50 transition-colors">
                <img
                  src={LOGO_ATS}
                  alt="American Truck Simulator Logo"
                  className="w-full h-full object-contain drop-shadow"
                  loading="lazy"
                />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-base flex items-center gap-2">
                  American Truck Simulator
                </h3>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
              {atsStats.total.distance.toLocaleString("id-ID")} Km
            </span>
          </div>

          {/* Mini Stats ATS */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-card/40 rounded-xl border border-border/40 mb-5">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                Selesai
              </p>
              <p className="text-lg font-bold text-green-400">
                {atsStats.total.completed}
              </p>
            </div>
            <div className="text-center border-x border-border/40">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                Batal
              </p>
              <p className="text-lg font-bold text-red-400">
                {atsStats.total.canceled}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">
                Total Jobs
              </p>
              <p className="text-lg font-bold text-foreground">
                {atsStats.total.totalJobs}
              </p>
            </div>
          </div>

          {/* Sub-Breakdown: Dimana Bermainnya (TruckersMP vs SP/Convoy) */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Tempat Bermain:
            </p>

            {/* TruckersMP */}
            <div className="p-3.5 rounded-xl bg-card/50 border border-border/50 hover:border-accent-sky/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent-sky/10 text-accent-sky">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      TruckersMP
                    </span>
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-sky/10 text-accent-sky border border-accent-sky/20">
                      Multiplayer
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {atsStats.truckersmp.distance.toLocaleString("id-ID")} Km
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Selesai:{" "}
                  <strong className="text-foreground">
                    {atsStats.truckersmp.completed}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  Batal:{" "}
                  <strong className="text-foreground">
                    {atsStats.truckersmp.canceled}
                  </strong>
                </span>
                <span>
                  Share:{" "}
                  <strong className="text-accent-sky">
                    {atsStats.total.distance > 0
                      ? Math.round(
                          (atsStats.truckersmp.distance /
                            atsStats.total.distance) *
                            100,
                        )
                      : 0}
                    %
                  </strong>
                </span>
              </div>
            </div>

            {/* SinglePlayer / Convoy */}
            <div className="p-3.5 rounded-xl bg-card/50 border border-border/50 hover:border-accent-lilac/40 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-accent-lilac/10 text-accent-lilac">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      SinglePlayer / Convoy
                    </span>
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent-lilac/10 text-accent-lilac border border-accent-lilac/20">
                      Official Game
                    </span>
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground">
                  {atsStats.sp.distance.toLocaleString("id-ID")} Km
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/30">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Selesai:{" "}
                  <strong className="text-foreground">
                    {atsStats.sp.completed}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  Batal:{" "}
                  <strong className="text-foreground">
                    {atsStats.sp.canceled}
                  </strong>
                </span>
                <span>
                  Share:{" "}
                  <strong className="text-accent-lilac">
                    {atsStats.total.distance > 0
                      ? Math.round(
                          (atsStats.sp.distance / atsStats.total.distance) *
                            100,
                        )
                      : 0}
                    %
                  </strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TABEL KOMPARASI BULAN DEMI BULAN (MONTH-BY-MONTH)        */}
      {/* ======================================================== */}
      {monthlyHistoryRows.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border-border/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent-lilac" /> Riwayat
              Komparasi Bulan ke Bulan
            </h3>
            <span className="text-xs text-muted-foreground">
              Total {monthlyHistoryRows.length} Periode Terekam
            </span>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Bulan</th>
                  <th className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <img
                        src={LOGO_ETS2}
                        alt="ETS2"
                        className="w-4 h-4 object-contain inline"
                      />
                      ETS2 (S / B)
                    </span>
                  </th>
                  <th className="py-2.5 px-3 text-right">Jarak ETS2</th>
                  <th className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <img
                        src={LOGO_ATS}
                        alt="ATS"
                        className="w-4 h-4 object-contain inline"
                      />
                      ATS (S / B)
                    </span>
                  </th>
                  <th className="py-2.5 px-3 text-right">Jarak ATS</th>
                  <th className="py-2.5 px-3 text-right">Total Jarak</th>
                  <th className="py-2.5 px-3 text-center">Rasio</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {paginatedHistoryRows.map((row) => {
                  const isCurrentRow = row.month === selectedMonth;
                  return (
                    <tr
                      key={row.month}
                      onClick={() => setSelectedMonth(row.month)}
                      className={`cursor-pointer transition-colors ${
                        isCurrentRow
                          ? "bg-accent-lilac/10 font-medium"
                          : "hover:bg-card/60"
                      }`}
                    >
                      <td className="py-3 px-3 font-semibold text-foreground whitespace-nowrap">
                        {row.monthLabel}
                        {isCurrentRow && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-accent-lilac/20 text-accent-lilac font-bold">
                            Aktif
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="text-green-400 font-bold">
                          {row.ets2.completed}
                        </span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-red-400">
                          {row.ets2.canceled}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground font-mono whitespace-nowrap">
                        {row.ets2.distance.toLocaleString("id-ID")} Km
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="text-green-400 font-bold">
                          {row.ats.completed}
                        </span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-red-400">{row.ats.canceled}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground font-mono whitespace-nowrap">
                        {row.ats.distance.toLocaleString("id-ID")} Km
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-foreground font-mono whitespace-nowrap">
                        {row.total.distance.toLocaleString("id-ID")} Km
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.total.completionRate >= 80
                              ? "bg-green-500/15 text-green-400 border border-green-500/30"
                              : row.total.completionRate >= 50
                                ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30"
                                : "bg-red-500/15 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {row.total.completionRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMonth(row.month);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-card hover:bg-muted text-accent-lilac border border-border/60 transition-colors"
                        >
                          Pilih
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalHistoryPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Menampilkan{" "}
                <span className="font-semibold text-foreground">
                  {(validHistoryPage - 1) * ITEMS_PER_PAGE + 1}
                </span>
                -
                <span className="font-semibold text-foreground">
                  {Math.min(
                    validHistoryPage * ITEMS_PER_PAGE,
                    monthlyHistoryRows.length
                  )}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-foreground">
                  {monthlyHistoryRows.length}
                </span>{" "}
                periode
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={validHistoryPage <= 1}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-card hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-card border border-border/60 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map(
                    (pageNum) => {
                      const isActive = pageNum === validHistoryPage;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setHistoryPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            isActive
                              ? "bg-accent-lilac text-white shadow-sm"
                              : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))
                  }
                  disabled={validHistoryPage >= totalHistoryPages}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-card hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:bg-card border border-border/60 transition-colors flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
