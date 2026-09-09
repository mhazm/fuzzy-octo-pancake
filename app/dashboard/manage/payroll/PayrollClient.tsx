"use client";

import React, { useState } from "react";
import {
  Coins,
  Award,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Gift,
  Ticket,
  Truck,
  Wrench,
  Sparkles,
  Radio,
  FileText,
  TrendingUp,
  ChevronRight,
  Calendar,
  Flame,
  Info,
  Lock,
  Unlock,
  Receipt,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  GraduationCap,
  ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showAlert, showConfirm } from "@/lib/dialog";

interface MilestoneTier {
  tier: number;
  label: string;
  bonusNc: number;
  penaltyTickets: number;
  vouchers: Array<{
    title: string;
    category: string;
    discountType: string;
    discountValue: number;
    durationHours?: number;
  }>;
}

interface PayrollClientProps {
  initialData: {
    currentMonth: string;
    previousMonth: string;
    currentMonthPerf: any;
    previousMonthData: any;
    historyRecords: any[];
    milestoneTiers: MilestoneTier[];
  };
  currentUser: {
    name: string;
    discordId: string;
    role: string;
    image?: string | null;
  };
}

export default function PayrollClient({
  initialData,
  currentUser,
}: PayrollClientProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const {
    currentMonth,
    previousMonth,
    currentMonthPerf,
    previousMonthData,
    historyRecords,
    milestoneTiers,
  } = data;

  const currentPoints = currentMonthPerf?.totalPoints || 0;
  const currentRewards = currentMonthPerf?.rewards || {
    totalNc: 10000,
    bonusNc: 0,
    penaltyTickets: 0,
  };
  const currentBreakdown = currentMonthPerf?.breakdown || {};

  // Find next milestone tier
  const nextTier = milestoneTiers.find((t) => t.tier > currentPoints);
  const pointsToNext = nextTier ? nextTier.tier - currentPoints : 0;

  // Format month to Indonesian label (e.g. "2026-09" -> "September 2026")
  const formatMonthLabel = (mStr: string) => {
    if (!mStr || !mStr.includes("-")) return mStr;
    const [year, month] = mStr.split("-");
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} ${year}`;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/manage/payroll", {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClaimSalary = async () => {
    if (!previousMonthData || previousMonthData.isClaimed) return;

    const confirmed = await showConfirm(
      `Klaim gaji dan insentif performa periode ${formatMonthLabel(previousMonth)}?\n\n` +
        `• Total Poin: ${previousMonthData.performance?.totalPoints || 0} Poin\n` +
        `• Total Cair: ${(previousMonthData.performance?.rewards?.totalNc || 10000).toLocaleString("id-ID")} NC\n` +
        `• Tiket Safebox: +${previousMonthData.performance?.rewards?.penaltyTickets || 0} Tiket\n` +
        `• Voucher: ${previousMonthData.performance?.rewards?.vouchers?.length || 0} Voucher\n\n` +
        `Seluruh reward akan langsung dicairkan ke saldo dan garasi akun Anda. Lanjutkan?`,
      "Konfirmasi Pencairan Gaji",
    );

    if (!confirmed) return;

    setIsClaiming(true);
    try {
      const res = await fetch("/api/manage/payroll/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ month: previousMonth }),
      });

      const resData = await res.json();

      if (!res.ok || !resData.success) {
        await showAlert(
          resData.error || "Gagal memproses klaim gaji.",
          "Gagal",
        );
        return;
      }

      await showAlert(
        `Selamat! Gaji & insentif performa periode ${formatMonthLabel(previousMonth)} sebesar ${(
          resData.data?.ncAmount || 0
        ).toLocaleString("id-ID")} NC berhasil dicairkan!`,
        "Pencairan Berhasil 🎉",
      );

      // Refresh data
      await handleRefresh();
      router.refresh();
    } catch (err: any) {
      await showAlert(err.message || "Terjadi kesalahan koneksi.", "Error");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="w-full min-h-screen pb-16 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6 md:p-8 shadow-xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-primary/10 dark:bg-primary/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Manager Payroll & Performance Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
              Sistem Gaji & Insentif Performa
            </h1>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
              Evaluasi kinerja bulanan staf manajemen VTC Nismara. Dihitung
              otomatis setiap tanggal 1 awal bulan dengan sistem reward
              berjenjang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-muted text-foreground text-sm font-medium border border-border transition shadow-sm disabled:opacity-50"
              title="Perbarui Data"
            >
              <RotateCcw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh Data
            </button>
            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-muted text-foreground text-sm font-medium border border-border transition shadow-sm"
            >
              <Receipt className="w-4 h-4 text-amber-500" />
              Riwayat Transaksi
            </Link>
          </div>
        </div>

        {/* Info Grid Pills */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/70">
            <Calendar className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Periode Berjalan
              </div>
              <div className="text-sm font-bold text-foreground">
                {formatMonthLabel(currentMonth)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/70">
            <Coins className="w-5 h-5 text-yellow-500 shrink-0" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Base Gaji Pokok
              </div>
              <div className="text-sm font-bold text-foreground">10.000 NC</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/70">
            <Clock className="w-5 h-5 text-indigo-500 dark:text-indigo-400 shrink-0" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Siklus Evaluasi
              </div>
              <div className="text-sm font-bold text-foreground">
                Tgl 1 Awal Bulan
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/70">
            <ShieldAlert className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                Proteksi Manipulasi
              </div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Anti-Abuse Active
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Claim Banner: Previous Month (Jika belum diklaim atau sudah diklaim) */}
      {previousMonthData && (
        <div className="relative overflow-hidden rounded-2xl border border-border transition-all duration-300">
          {!previousMonthData.isClaimed ? (
            <div className="p-6 md:p-8 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border-amber-500/30 shadow-xl relative">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    Siap Dicairkan
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-foreground">
                    Gaji & Insentif Periode {formatMonthLabel(previousMonth)}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xl">
                    Evaluasi performa bulan lalu telah ditutup. Anda
                    mengumpulkan total{" "}
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {previousMonthData.performance?.totalPoints || 0} Poin
                    </span>{" "}
                    dan berhak mencairkan reward berikut:
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/90 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-sm shadow-sm">
                      <Coins className="w-4 h-4" />
                      {(
                        previousMonthData.performance?.rewards?.totalNc || 10000
                      ).toLocaleString("id-ID")}{" "}
                      NC
                    </div>
                    {previousMonthData.performance?.rewards?.penaltyTickets >
                      0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/90 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-sm shadow-sm">
                        <Ticket className="w-4 h-4" />+
                        {previousMonthData.performance?.rewards?.penaltyTickets}{" "}
                        Tiket Safebox
                      </div>
                    )}
                    {previousMonthData.performance?.rewards?.vouchers?.length >
                      0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/90 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 font-bold text-sm shadow-sm">
                        <Gift className="w-4 h-4" />
                        {
                          previousMonthData.performance?.rewards?.vouchers
                            ?.length
                        }{" "}
                        Voucher Diskon
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                  <button
                    onClick={handleClaimSalary}
                    disabled={isClaiming}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/25 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    {isClaiming ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        Memproses Pencairan...
                      </>
                    ) : (
                      <>
                        <Gift className="w-5 h-5" />
                        Klaim Gaji & Bonus Sekarang
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 md:p-5 bg-card border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    Gaji Periode {formatMonthLabel(previousMonth)} Sudah Diklaim
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Dicairkan pada:{" "}
                    {new Date(
                      previousMonthData.record?.claimedAt,
                    ).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    WIB
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(previousMonthData.record)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border transition shadow-sm"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-500" />
                Lihat Slip Gaji
              </button>
            </div>
          )}
        </div>
      )}

      {/* Live KPI Tracker Bulan Berjalan */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Live KPI Tracker — Periode {formatMonthLabel(currentMonth)}
            </h2>
            <p className="text-xs text-muted-foreground">
              Pantau poin performa Anda secara langsung di bulan ini sebelum
              dievaluasi pada tanggal 1 berikutnya.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              Poin Terkumpul:
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-extrabold text-sm">
              {currentPoints} Poin
            </span>
          </div>
        </div>

        {/* Live Milestone Progress Card */}
        <div className="rounded-2xl bg-card border border-border p-6 space-y-6 shadow-xl">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-6 border-b border-border">
            <div className="p-4 rounded-xl bg-muted/30 border border-border/70">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Estimasi Total Cair
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Coins className="w-6 h-6" />
                {currentRewards.totalNc.toLocaleString("id-ID")} NC
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Base 10.000 NC + Bonus{" "}
                {currentRewards.bonusNc.toLocaleString("id-ID")} NC
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/70">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Bonus Tiket Safebox
              </div>
              <div className="text-2xl font-black text-red-600 dark:text-red-400 flex items-center gap-2">
                <Ticket className="w-6 h-6" />+{currentRewards.penaltyTickets}{" "}
                Tiket
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Otomatis masuk ke Safebox Stock garasi
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border/70">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Target Milestone Terdekat
              </div>
              {nextTier ? (
                <div>
                  <div className="text-2xl font-black text-foreground flex items-center gap-2">
                    <Award className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
                    Tier {nextTier.tier} Poin
                  </div>
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                    Kurang {pointsToNext} poin lagi &rarr; {nextTier.label}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <Flame className="w-6 h-6" />
                    Master Tier!
                  </div>
                  <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-1">
                    Infinite Loop Aktif (+5.000 NC & +1 Safebox / 10 Poin)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visual Milestone Ladder Track */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Jalur Milestone Reward (0 &rarr; 100 Poin)</span>
              <span>{Math.min(100, currentPoints)} / 100 Poin</span>
            </div>

            {/* Progress Bar Container */}
            <div className="relative w-full h-3.5 bg-muted rounded-full border border-border overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 rounded-full transition-all duration-700 shadow-sm"
                style={{
                  width: `${Math.min(100, Math.max(0, currentPoints))}%`,
                }}
              />
            </div>

            {/* Milestone Step Indicators */}
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2 pt-2">
              {milestoneTiers.map((m) => {
                const isReached = currentPoints >= m.tier;
                return (
                  <div
                    key={m.tier}
                    className={`group relative p-2 rounded-xl border text-center transition-all ${
                      isReached
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
                        : "bg-muted/30 border-border/80 text-muted-foreground"
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5">
                      T{m.tier}
                    </div>
                    <div className="text-xs font-extrabold flex items-center justify-center gap-1">
                      {isReached ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
                      )}
                      <span>{m.tier}pt</span>
                    </div>

                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 rounded-xl bg-popover border border-border shadow-2xl text-[11px] text-popover-foreground hidden group-hover:block z-50 pointer-events-none">
                      <div className="font-bold text-amber-500 mb-0.5">
                        Milestone {m.tier} Poin
                      </div>
                      <div className="text-muted-foreground">{m.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 8 Kategori Indikator Kontribusi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Tiket Support */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 hover:border-primary/40 transition shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <FileText className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                1 Poin / Tiket
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">
                Tiket Support Ditangani
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {currentBreakdown.ticketsHandled || 0} Tiket
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Poin Didapat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{currentBreakdown.ticketPoints || 0} Poin
              </span>
            </div>
          </div>

          {/* 2. Order Fleet */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 hover:border-primary/40 transition shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Truck className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                1 Poin / Order
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">
                Order Pembelian Fleet
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {currentBreakdown.fleetOrdersHandled || 0} Order
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Poin Didapat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{currentBreakdown.fleetOrderPoints || 0} Poin
              </span>
            </div>
          </div>

          {/* 3. Servis Armada */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 hover:border-primary/40 transition shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                1 Poin / Servis
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">
                Konfirmasi Servis Armada
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {currentBreakdown.fleetServicesHandled || 0} Servis
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Poin Didapat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{currentBreakdown.fleetServicePoints || 0} Poin
              </span>
            </div>
          </div>

          {/* 4. Host Konvoi */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 hover:border-primary/40 transition shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                <Radio className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                Base 2 + 1/Peserta
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">
                Penyelenggaraan Konvoi
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {currentBreakdown.convoysHosted || 0} Konvoi (
                {currentBreakdown.convoyParticipants || 0} Peserta)
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Poin Didapat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{currentBreakdown.convoyPoints || 0} Poin
              </span>
            </div>
          </div>

          {/* 5. Special Contracts */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 hover:border-primary/40 transition shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                5 Poin / Kontrak
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">
                Pembuatan Special Contract
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {currentBreakdown.contractsCreated || 0} Kontrak
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Poin Didapat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{currentBreakdown.contractPoints || 0} Poin
              </span>
            </div>
          </div>

          {/* 6. NC Boost Event */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 hover:border-primary/40 transition shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <Coins className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                5 Poin / Event
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">
                Pembuatan Event NC Boost
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {currentBreakdown.boostEventsCreated || 0} Event
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Poin Didapat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{currentBreakdown.boostPoints || 0} Poin
              </span>
            </div>
          </div>

          {/* 7. Review Mod Market */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 hover:border-primary/40 transition shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
                <Award className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                2 Poin / Mod
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">
                Review Mod Market Items
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {currentBreakdown.modsReviewed || 0} Mod
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Poin Didapat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{currentBreakdown.modPoints || 0} Poin
              </span>
            </div>
          </div>

          {/* 8. Jarak Tempuh Job Mengemudi */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 hover:border-primary/40 transition shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <Flame className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                1 Poin / 1.000 KM
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">
                Jarak Tempuh Job Driver
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {(currentBreakdown.distanceKm || 0).toLocaleString("id-ID")} KM
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Poin Didapat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{currentBreakdown.distancePoints || 0} Poin
              </span>
            </div>
          </div>

          {/* 9. Kelulusan Driver Magang */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 hover:border-primary/40 transition shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                3 Poin / Driver
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">
                Kelulusan Driver Magang
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {currentBreakdown.internPromotionsHandled || 0} Dipromosikan
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Poin Didapat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{currentBreakdown.internPromotionPoints || 0} Poin
              </span>
            </div>
          </div>

          {/* 10. Audit / Evaluasi Driver Magang */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 hover:border-primary/40 transition shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                <ClipboardCheck className="w-4 h-4" />
              </div>
              <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground border border-border/50">
                2 Poin / Evaluasi
              </span>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-semibold">
                Audit / Evaluasi Driver Magang
              </div>
              <div className="text-xl font-black text-foreground mt-0.5">
                {currentBreakdown.internEvaluationsHandled || 0} Evaluasi
              </div>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Poin Didapat:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                +{currentBreakdown.internEvaluationPoints || 0} Poin
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Riwayat Slip Gaji Arsip */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            Arsip Slip Gaji & Klaim Masa Lalu
          </h2>
          <p className="text-xs text-muted-foreground">
            Daftar lengkap riwayat pencairan gaji dan bonus performa manager
            yang telah Anda klaim.
          </p>
        </div>

        {historyRecords && historyRecords.length > 0 ? (
          <div className="overflow-hidden rounded-2xl bg-card border border-border shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-6 py-4">Periode</th>
                    <th className="px-6 py-4">ID Transaksi</th>
                    <th className="px-6 py-4">Poin Performa</th>
                    <th className="px-6 py-4">Total NC Cair</th>
                    <th className="px-6 py-4">Bonus Tambahan</th>
                    <th className="px-6 py-4">Tanggal Dicairkan</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {historyRecords.map((r: any) => (
                    <tr
                      key={r._id || r.month}
                      className="hover:bg-muted/40 transition"
                    >
                      <td className="px-6 py-4 font-bold text-foreground whitespace-nowrap">
                        {formatMonthLabel(r.month)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
                        {r.claimedTrxId || "-"}
                      </td>
                      <td className="px-6 py-4 font-bold text-foreground">
                        {r.totalPoints} Poin
                      </td>
                      <td className="px-6 py-4 font-extrabold text-amber-600 dark:text-amber-400">
                        {(r.rewardsGranted?.ncAmount || 0).toLocaleString(
                          "id-ID",
                        )}{" "}
                        NC
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <div className="flex flex-col gap-0.5">
                          {r.rewardsGranted?.penaltyTickets > 0 && (
                            <span className="text-red-600 dark:text-red-400 font-semibold">
                              +{r.rewardsGranted?.penaltyTickets} Tiket Safebox
                            </span>
                          )}
                          {r.rewardsGranted?.vouchers?.length > 0 && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                              +{r.rewardsGranted?.vouchers?.length} Voucher
                              Diskon
                            </span>
                          )}
                          {!r.rewardsGranted?.penaltyTickets &&
                            !r.rewardsGranted?.vouchers?.length && (
                              <span className="text-muted-foreground">-</span>
                            )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {r.claimedAt
                          ? `${new Date(r.claimedAt).toLocaleString("id-ID", {
                              timeZone: "Asia/Jakarta",
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })} WIB`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedReceipt(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-muted text-foreground text-xs font-semibold border border-border transition shadow-sm"
                        >
                          <Receipt className="w-3.5 h-3.5 text-amber-500" />
                          Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-2">
            <Receipt className="w-8 h-8 text-muted-foreground/50 mx-auto" />
            <div className="text-sm font-bold text-muted-foreground">
              Belum Ada Arsip Slip Gaji
            </div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Riwayat slip gaji akan muncul secara otomatis setelah Anda
              mencairkan gaji bulanan pertama Anda.
            </p>
          </div>
        )}
      </div>

      {/* Slip Gaji Digital Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 md:p-8 shadow-2xl space-y-6 text-card-foreground">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Slip Gaji Digital Manager
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Nismara Transport Official Payroll
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/80 text-xs">
                <div>
                  <span className="text-muted-foreground block">Periode Evaluasi:</span>
                  <span className="font-bold text-foreground">
                    {formatMonthLabel(selectedReceipt.month)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status Klaim:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    LUNAS / CLAIMED
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">ID Transaksi:</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400">
                    {selectedReceipt.claimedTrxId || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Waktu Pencairan:</span>
                  <span className="text-foreground">
                    {selectedReceipt.claimedAt
                      ? `${new Date(selectedReceipt.claimedAt).toLocaleString(
                          "id-ID",
                          {
                            timeZone: "Asia/Jakarta",
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )} WIB`
                      : "-"}
                  </span>
                </div>
              </div>

              {/* Rincian Poin & Nilai */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Rincian Performa
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gaji Pokok (Base):</span>
                    <span className="font-bold text-foreground">10.000 NC</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Poin Performa Tercapai:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {selectedReceipt.totalPoints} Poin
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Bonus Tambahan Poin:</span>
                    <span className="font-bold text-foreground">
                      {(
                        (selectedReceipt.rewardsGranted?.ncAmount || 10000) -
                        10000
                      ).toLocaleString("id-ID")}{" "}
                      NC
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between text-sm font-black text-amber-600 dark:text-amber-400">
                    <span>TOTAL NC DITERIMA:</span>
                    <span>
                      {(
                        selectedReceipt.rewardsGranted?.ncAmount || 0
                      ).toLocaleString("id-ID")}{" "}
                      NC
                    </span>
                  </div>
                </div>
              </div>

              {/* Item Tambahan */}
              {(selectedReceipt.rewardsGranted?.penaltyTickets > 0 ||
                (selectedReceipt.rewardsGranted?.vouchers &&
                  selectedReceipt.rewardsGranted.vouchers.length > 0)) && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Item Tambahan Diterima
                  </div>
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-2 text-xs">
                    {selectedReceipt.rewardsGranted?.penaltyTickets > 0 && (
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                        <Ticket className="w-4 h-4" />
                        <span>
                          +{selectedReceipt.rewardsGranted.penaltyTickets} Tiket
                          Penghapus Penalti (Safebox)
                        </span>
                      </div>
                    )}
                    {selectedReceipt.rewardsGranted?.vouchers?.map(
                      (v: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-foreground font-medium"
                        >
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                            <span>{v.title}</span>
                          </div>
                          <span className="font-mono text-amber-600 dark:text-amber-400 text-[11px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {v.code}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="w-full py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition border border-border"
              >
                Tutup Slip Gaji
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
