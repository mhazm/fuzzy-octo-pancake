"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Truck,
  CheckCircle2,
  PackageCheck,
  Coins,
  Crown,
  Medal,
  Award,
  Calendar,
  ChevronDown,
  User,
  Sparkles,
  Trophy,
} from "lucide-react";
import UserBadges from "@/components/icons/UserBadges";
import {
  LeaderboardCategory,
  LeaderboardResult,
  formatLeaderboardMonthLabel,
} from "@/types/leaderboard";

interface LeaderboardUIProps {
  initialData: LeaderboardResult;
  availableMonths: string[];
  currentDiscordId?: string;
}

const CATEGORY_CONFIG: Record<
  LeaderboardCategory,
  {
    label: string;
    shortLabel: string;
    unit: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badgeBg: string;
    badgeBorder: string;
  }
> = {
  distance: {
    label: "Total Jarak Tempuh",
    shortLabel: "Kilometer",
    unit: "KM",
    description: "Jarak tempuh resmi seluruh pengiriman yang telah selesai",
    icon: Truck,
    accentColor: "text-sky-500 dark:text-sky-400",
    badgeBg: "bg-sky-500/10",
    badgeBorder: "border-sky-500/30",
  },
  jobs: {
    label: "Pekerjaan Selesai",
    shortLabel: "Jobs Selesai",
    unit: "Jobs",
    description: "Total kuantitas pekerjaan kargo yang berhasil dikirimkan",
    icon: CheckCircle2,
    accentColor: "text-emerald-500 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeBorder: "border-emerald-500/30",
  },
  mass: {
    label: "Tonase Muatan",
    shortLabel: "Tonase Kargo",
    unit: "Ton",
    description: "Akumulasi berat muatan kargo yang berhasil diantarkan",
    icon: PackageCheck,
    accentColor: "text-amber-500 dark:text-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeBorder: "border-amber-500/30",
  },
  nc: {
    label: "Nismara Coin (NC)",
    shortLabel: "NC Didapat",
    unit: "NC",
    description: "Total pendapatan koin komunitas dari pekerjaan dan bonus",
    icon: Coins,
    accentColor: "text-rose-500 dark:text-rose-400",
    badgeBg: "bg-rose-500/10",
    badgeBorder: "border-rose-500/30",
  },
};

export default function LeaderboardUI({
  initialData,
  availableMonths,
  currentDiscordId,
}: LeaderboardUIProps) {
  const [data, setData] = useState<LeaderboardResult>(initialData);
  const [selectedCategory, setSelectedCategory] =
    useState<LeaderboardCategory>(initialData.category);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    initialData.period
  );
  const [isPending, startTransition] = useTransition();

  const currentCategoryConfig = CATEGORY_CONFIG[selectedCategory];

  // Fungsi pengubah kategori / bulan
  const handleFilterChange = async (
    newCategory: LeaderboardCategory,
    newPeriod: string
  ) => {
    setSelectedCategory(newCategory);
    setSelectedPeriod(newPeriod);

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/leaderboard?category=${newCategory}&period=${newPeriod}`,
          {
            cache: "no-store",
            headers: {
              Pragma: "no-cache",
              "Cache-Control": "no-cache",
            },
          }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setData(json);
          }
        }
      } catch (err) {
        console.error("Gagal memperbarui leaderboard:", err);
      }
    });
  };

  const formatScore = (val: number, cat: LeaderboardCategory) => {
    if (cat === "nc") {
      return val.toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
    if (cat === "distance" || cat === "mass") {
      return val.toLocaleString("id-ID", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
    }
    return val.toLocaleString("id-ID");
  };

  // Ekstraksi Top 3 untuk podium
  const top1 = data.top10[0] || null;
  const top2 = data.top10[1] || null;
  const top3 = data.top10[2] || null;
  const restDrivers = data.top10.slice(3);

  return (
    <div className="space-y-8 pb-16">
      {/* 1. HEADER UTAMA & FILTER CONTROL */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-4 border-b border-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/80 border border-border text-[11px] font-semibold text-muted-foreground mb-3 tracking-wide uppercase">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Papan Peringkat Resmi Pengemudi
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground uppercase">
            Hall of <span className="text-primary">Logistics</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Catatan prestasi, dedikasi penjelajahan aspal, dan performa armada
            pengemudi Nismara Transport.
          </p>
        </div>

        {/* Month Selector Dropdown */}
        <div className="flex items-center gap-3 self-start lg:self-auto bg-card p-1.5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="hidden sm:inline">Periode:</span>
          </div>

          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) =>
                handleFilterChange(selectedCategory, e.target.value)
              }
              className="appearance-none bg-background hover:bg-muted/50 text-foreground text-xs font-bold py-2 pl-3.5 pr-8 rounded-xl border border-border focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatLeaderboardMonthLabel(m)}
                </option>
              ))}
              <option value="all">Sepanjang Masa (All-Time)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGASI 4 KATEGORI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(
          Object.keys(CATEGORY_CONFIG) as LeaderboardCategory[]
        ).map((catKey) => {
          const cfg = CATEGORY_CONFIG[catKey];
          const Icon = cfg.icon;
          const isActive = selectedCategory === catKey;

          return (
            <button
              key={catKey}
              onClick={() => handleFilterChange(catKey, selectedPeriod)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                isActive
                  ? "bg-card border-primary/50 text-foreground shadow-md ring-1 ring-primary/30"
                  : "bg-card/40 border-border text-muted-foreground hover:border-border hover:bg-card/80 hover:text-foreground"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`p-2.5 rounded-xl border transition-transform group-hover:scale-105 ${
                    isActive
                      ? `${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.accentColor}`
                      : "bg-muted border-border text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {isActive && (
                  <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </div>

              <div className="text-sm font-bold text-foreground tracking-tight">
                {cfg.shortLabel}
              </div>
              <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                Satuan: <span className="font-semibold text-foreground/80">{cfg.unit}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. KARTU "MY RANK" (PENGEMUDI AKTIF) */}
      {currentDiscordId ? (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            data.myRank?.isTop10
              ? "bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/20"
              : data.myRank?.rank
              ? "bg-card border-border shadow-sm"
              : "bg-muted/30 border-border/70"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-foreground/70" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Posisi Anda di {data.periodLabel}
                  </span>
                  {data.myRank?.isTop10 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold">
                      ⭐ Masuk Top 10
                    </span>
                  )}
                </div>

                <div className="text-xl font-extrabold text-foreground flex items-baseline gap-2 mt-0.5">
                  {data.myRank?.rank ? (
                    <>
                      <span>Peringkat #{data.myRank.rank}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        dari {data.totalActiveDrivers} pengemudi aktif
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm font-medium">
                      Belum ada catatan aktivitas pada periode ini
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-col sm:items-end justify-between border-t sm:border-t-0 border-border pt-3 sm:pt-0 gap-1">
              <div className="text-xs text-muted-foreground">Capaian Anda:</div>
              <div className="text-lg font-black font-mono text-foreground">
                {formatScore(data.myRank?.score || 0, selectedCategory)}{" "}
                <span className="text-xs font-bold text-muted-foreground">
                  {currentCategoryConfig.unit}
                </span>
              </div>
              {data.myRank?.diffToTop10 !== null &&
                data.myRank?.diffToTop10 !== undefined &&
                data.myRank.diffToTop10 > 0 && (
                  <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    Kurang {formatScore(data.myRank.diffToTop10, selectedCategory)}{" "}
                    {currentCategoryConfig.unit} menuju Top 10
                  </div>
                )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Ingin melihat posisi dan statistik pribadi Anda? Masuk dengan akun
              Discord untuk melacak peringkat Anda.
            </span>
          </div>
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors shrink-0"
          >
            Masuk
          </Link>
        </div>
      )}

      {/* 4. LOADING STATE OVERLAY / INDICATOR */}
      {isPending && (
        <div className="py-2 text-center text-xs font-semibold text-muted-foreground animate-pulse">
          Memuat pembaruan data leaderboard...
        </div>
      )}

      {/* 5. PODIUM TOP 3 (CHAMPION, RUNNER UP, 3RD PLACE) */}
      {data.top10.length > 0 ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-6">
            {/* --- RUNNER UP (#2 - KIRI) --- */}
            {top2 ? (
              <div
                className={`order-2 md:order-1 rounded-3xl p-6 border transition-all flex flex-col items-center text-center relative overflow-hidden group shadow-md ${
                  top2.isCurrentUser
                    ? "bg-card border-slate-400 ring-2 ring-primary/40"
                    : "bg-card border-slate-300 dark:border-slate-700/60 hover:border-slate-400"
                }`}
              >
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-400/30 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center gap-1.5">
                  <Medal className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  #2 RUNNER-UP
                </div>

                {top2.isCurrentUser && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase">
                    Anda
                  </div>
                )}

                {/* Avatar */}
                <div className="mt-8 mb-4 relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-slate-300 dark:border-slate-600 shadow-md">
                    <img
                      src={
                        top2.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          top2.name
                        )}&background=334155&color=fff`
                      }
                      alt={top2.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Name & Badges */}
                <div className="relative z-10 hover:z-50 w-full">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <Link
                      href={top2.truckyId ? `/profile/${top2.truckyId}` : "#"}
                      className="text-lg font-black text-foreground hover:text-primary hover:underline transition-colors truncate max-w-[200px]"
                    >
                      {top2.name}
                    </Link>
                    <UserBadges
                      role={top2.role || undefined}
                      isNismaraPlus={top2.isNismaraPlus}
                      truckyRank={top2.truckyRank || undefined}
                      isBooster={top2.isBooster}
                      topManager={top2.topManager}
                    />
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    {top2.truckyRank || "Driver"} • ID: #{top2.truckyId || "—"}
                  </div>
                </div>

                {/* Score */}
                <div className="mt-6 pt-4 border-t border-border w-full">
                  <div className="text-2xl font-black font-mono tabular-nums text-foreground">
                    {formatScore(top2.score, selectedCategory)}
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {currentCategoryConfig.unit}
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-2 md:order-1 p-6 rounded-3xl border border-dashed border-border text-center text-xs text-muted-foreground">
                Belum ada pengemudi di posisi #2
              </div>
            )}

            {/* --- JUARA 1 (#1 - TENGAH / ELEVATED) --- */}
            {top1 ? (
              <div
                className={`order-1 md:order-2 rounded-3xl p-7 border-2 transition-all flex flex-col items-center text-center relative overflow-hidden group shadow-xl -translate-y-2 md:-translate-y-4 ${
                  top1.isCurrentUser
                    ? "bg-gradient-to-b from-amber-500/15 via-card to-card border-amber-500 ring-2 ring-amber-400/50"
                    : "bg-gradient-to-b from-amber-500/10 via-card to-card border-amber-500/60 hover:border-amber-500"
                }`}
              >
                {/* Crown Glow Accent */}
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-black text-xs flex items-center gap-1.5 shadow-sm">
                  <Crown className="w-4 h-4 text-amber-500" />
                  #1 JUARA UTAMA
                </div>

                {top1.isCurrentUser && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase">
                    Anda
                  </div>
                )}

                {/* Avatar with Golden Frame */}
                <div className="mt-8 mb-4 relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-amber-400 shadow-xl shadow-amber-500/20">
                    <img
                      src={
                        top1.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          top1.name
                        )}&background=B45309&color=fff`
                      }
                      alt={top1.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -top-3 -right-2 bg-amber-500 text-black p-1.5 rounded-full shadow-lg">
                    <Crown className="w-4 h-4 text-zinc-950 fill-zinc-950" />
                  </div>
                </div>

                {/* Name & Badges */}
                <div className="relative z-10 hover:z-50 w-full">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <Link
                      href={top1.truckyId ? `/profile/${top1.truckyId}` : "#"}
                      className="text-xl font-black text-foreground hover:text-amber-500 hover:underline transition-colors truncate max-w-[220px]"
                    >
                      {top1.name}
                    </Link>
                    <UserBadges
                      role={top1.role || undefined}
                      isNismaraPlus={top1.isNismaraPlus}
                      truckyRank={top1.truckyRank || undefined}
                      isBooster={top1.isBooster}
                      topManager={top1.topManager}
                    />
                  </div>
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-300 mt-1">
                    {top1.truckyRank || "Master Driver"} • ID: #{top1.truckyId || "—"}
                  </div>
                </div>

                {/* Score */}
                <div className="mt-6 pt-4 border-t border-amber-500/20 w-full">
                  <div className="text-3xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
                    {formatScore(top1.score, selectedCategory)}
                  </div>
                  <div className="text-xs font-bold text-amber-700/70 dark:text-amber-200/70 mt-0.5">
                    {currentCategoryConfig.unit}
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-1 md:order-2 p-8 rounded-3xl border border-dashed border-border text-center text-xs text-muted-foreground">
                Belum ada pengemudi terdaftar
              </div>
            )}

            {/* --- JUARA 3 (#3 - KANAN) --- */}
            {top3 ? (
              <div
                className={`order-3 rounded-3xl p-6 border transition-all flex flex-col items-center text-center relative overflow-hidden group shadow-md ${
                  top3.isCurrentUser
                    ? "bg-card border-amber-700/60 ring-2 ring-primary/40"
                    : "bg-card border-amber-700/30 dark:border-amber-700/40 hover:border-amber-600"
                }`}
              >
                <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-amber-700/10 border border-amber-700/30 text-amber-800 dark:text-amber-400 font-black text-xs flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  #3 PODIUM
                </div>

                {top3.isCurrentUser && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase">
                    Anda
                  </div>
                )}

                {/* Avatar */}
                <div className="mt-8 mb-4 relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-amber-700/50 shadow-md">
                    <img
                      src={
                        top3.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          top3.name
                        )}&background=78350F&color=fff`
                      }
                      alt={top3.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Name & Badges */}
                <div className="relative z-10 hover:z-50 w-full">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                    <Link
                      href={top3.truckyId ? `/profile/${top3.truckyId}` : "#"}
                      className="text-lg font-black text-foreground hover:text-primary hover:underline transition-colors truncate max-w-[200px]"
                    >
                      {top3.name}
                    </Link>
                    <UserBadges
                      role={top3.role || undefined}
                      isNismaraPlus={top3.isNismaraPlus}
                      truckyRank={top3.truckyRank || undefined}
                      isBooster={top3.isBooster}
                      topManager={top3.topManager}
                    />
                  </div>
                  <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                    {top3.truckyRank || "Driver"} • ID: #{top3.truckyId || "—"}
                  </div>
                </div>

                {/* Score */}
                <div className="mt-6 pt-4 border-t border-border w-full">
                  <div className="text-2xl font-black font-mono tabular-nums text-foreground">
                    {formatScore(top3.score, selectedCategory)}
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground mt-0.5">
                    {currentCategoryConfig.unit}
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-3 p-6 rounded-3xl border border-dashed border-border text-center text-xs text-muted-foreground">
                Belum ada pengemudi di posisi #3
              </div>
            )}
          </div>

          {/* 6. TABEL PERINGKAT 4 S/D 10 */}
          {restDrivers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <span>Peringkat 4 s/d 10</span>
                <span>Capaian {currentCategoryConfig.shortLabel}</span>
              </div>

              <div className="rounded-3xl bg-card border border-border divide-y divide-border overflow-hidden shadow-md">
                {restDrivers.map((driver) => {
                  const uniqueKey = `${driver.discordId}-${driver.rank}`;
                  return (
                    <div
                      key={uniqueKey}
                      className={`flex items-center justify-between p-4 px-6 transition-colors group relative z-10 hover:z-50 ${
                        driver.isCurrentUser
                          ? "bg-primary/10 hover:bg-primary/15"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                        {/* Rank Badge */}
                        <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center text-xs font-black font-mono text-foreground shrink-0">
                          #{driver.rank}
                        </div>

                        {/* Driver Profile */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-border shrink-0">
                            <img
                              src={
                                driver.image ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  driver.name
                                )}&background=27272A&color=fff`
                              }
                              alt={driver.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={
                                  driver.truckyId
                                    ? `/profile/${driver.truckyId}`
                                    : "#"
                                }
                                className="text-sm font-bold text-foreground hover:text-primary hover:underline transition-colors truncate max-w-[160px] sm:max-w-[240px]"
                              >
                                {driver.name}
                              </Link>
                              <UserBadges
                                role={driver.role || undefined}
                                isNismaraPlus={driver.isNismaraPlus}
                                truckyRank={driver.truckyRank || undefined}
                                isBooster={driver.isBooster}
                                topManager={driver.topManager}
                              />
                              {driver.isCurrentUser && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-primary text-primary-foreground leading-none">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {driver.truckyRank || "Driver"} • ID: #{driver.truckyId || "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score display */}
                      <div className="text-right shrink-0 pl-4">
                        <div className="text-base sm:text-lg font-black font-mono tabular-nums text-foreground">
                          {formatScore(driver.score, selectedCategory)}
                        </div>
                        <div className="text-[11px] font-semibold text-muted-foreground">
                          {currentCategoryConfig.unit}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-24 rounded-3xl bg-muted/20 border border-dashed border-border text-center space-y-3">
          <Truck className="w-12 h-12 text-muted-foreground/60 mx-auto" />
          <h3 className="text-base font-bold text-foreground">
            Belum Ada Data di Periode Ini
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tidak ditemukan riwayat pekerjaan untuk kategori{" "}
            <span className="text-foreground font-semibold">
              {currentCategoryConfig.label}
            </span>{" "}
            pada periode{" "}
            <span className="text-foreground font-semibold">
              {data.periodLabel}
            </span>
            .
          </p>
        </div>
      )}
    </div>
  );
}
