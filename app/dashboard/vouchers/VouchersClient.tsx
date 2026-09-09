"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Ticket,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  ArrowUpRight,
  Wrench,
  Truck,
  Sparkles,
  ShoppingBag,
  Zap,
  Flame,
  Timer,
} from "lucide-react";
import { showAlert, showConfirm } from "@/lib/dialog";
import { useRouter } from "next/navigation";

interface VoucherItem {
  _id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  durationHours?: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscount?: number;
  minSpend?: number;
  status: "ACTIVE" | "USED" | "EXPIRED";
  source?: string;
  expiresAt?: string | null;
  usedAt?: string | null;
  createdAt: string;
}

export default function VouchersClient({
  initialVouchers,
  initialNcBoost,
}: {
  initialVouchers: VoucherItem[];
  initialNcBoost?: any;
}) {
  const router = useRouter();
  const [vouchers, setVouchers] = useState<VoucherItem[]>(initialVouchers);
  const [ncBoost, setNcBoost] = useState<any>(initialNcBoost);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");

  // Sync state if initial props change
  useEffect(() => {
    setVouchers(initialVouchers);
  }, [initialVouchers]);

  useEffect(() => {
    setNcBoost(initialNcBoost);
  }, [initialNcBoost]);

  // Booster Timer Countdown
  useEffect(() => {
    if (!ncBoost || !ncBoost.active || !ncBoost.expiredAt) {
      setTimeLeftStr("");
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(ncBoost.expiredAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeftStr("Kedaluwarsa");
        setNcBoost((prev: any) => ({ ...prev, active: false }));
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeftStr(
          `${hours > 0 ? `${hours} Jam ` : ""}${minutes} Menit ${seconds} Detik`,
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [ncBoost]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleActivateBooster = async (voucher: VoucherItem) => {
    const isCurrentlyActive =
      ncBoost && ncBoost.active && new Date(ncBoost.expiredAt) > new Date();

    if (isCurrentlyActive) {
      await showAlert(
        "Anda masih memiliki NC Booster aktif. Tunggu hingga durasi booster saat ini selesai sebelum mengaktifkan booster baru.",
      );
      return;
    }

    const boostPercent = voucher.discountValue || 50;
    const hours = voucher.durationHours || 2;

    const confirmed = await showConfirm(
      `Aktifkan voucher ini sekarang? Bonus +${boostPercent}% NC akan aktif untuk setiap pengiriman job selama ${hours} jam ke depan.`,
    );

    if (!confirmed) return;

    setIsActivating(voucher._id);
    try {
      const res = await fetch("/api/vouchers/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherId: voucher._id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengaktifkan booster");
      }

      // Update local state
      setVouchers((prev) =>
        prev.map((v) =>
          v._id === voucher._id
            ? { ...v, status: "USED", usedAt: new Date().toISOString() }
            : v,
        ),
      );

      setNcBoost({
        active: true,
        multiplier: data.multiplier || boostPercent / 100,
        expiredAt: data.expiredAt,
        voucherTitle: voucher.title,
      });

      await showAlert(data.message || "⚡ NC Booster berhasil diaktifkan!");
      router.refresh();
    } catch (err: any) {
      await showAlert(`Gagal: ${err.message}`);
    } finally {
      setIsActivating(null);
    }
  };

  const filteredVouchers = vouchers.filter((v) => {
    // Tab filter
    if (activeTab === "ACTIVE" && v.status !== "ACTIVE") return false;
    if (activeTab === "HISTORY" && v.status === "ACTIVE") return false;

    // Category filter
    if (categoryFilter !== "ALL" && v.category !== categoryFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = v.title?.toLowerCase().includes(q);
      const matchCode = v.code?.toLowerCase().includes(q);
      const matchSource = v.source?.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchSource) return false;
    }

    return true;
  });

  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case "NC_BOOSTER":
        return {
          label: "NC Booster",
          icon: Zap,
          color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
          link: "#",
          actionLabel: "Aktifkan Booster",
          isBooster: true,
        };
      case "FLEET_MAINTENANCE":
        return {
          label: "Servis Armada",
          icon: Wrench,
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          link: "/dashboard/garage",
          actionLabel: "Buka Garasi",
          isBooster: false,
        };
      case "FLEET_BUY":
        return {
          label: "Dealer Armada",
          icon: Truck,
          color: "text-teal-400 bg-teal-500/10 border-teal-500/30",
          link: "/dashboard/garage/fleet/buy",
          actionLabel: "Beli Armada",
          isBooster: false,
        };
      case "MARKET_MOD":
        return {
          label: "Market Mod",
          icon: ShoppingBag,
          color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
          link: "/market",
          actionLabel: "Buka Market",
          isBooster: false,
        };
      default:
        return {
          label: "Umum",
          icon: Ticket,
          color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
          link: "/dashboard",
          actionLabel: "Dashboard",
          isBooster: false,
        };
    }
  };

  const isBoostActive =
    ncBoost && ncBoost.active && new Date(ncBoost.expiredAt) > new Date();

  return (
    <div className="space-y-6">
      {/* ⚡ Active NC Booster Banner (If user has an active booster) */}
      {isBoostActive && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-950/30 border border-amber-500/40 p-5 backdrop-blur-xl shadow-lg animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black shadow-md shadow-amber-500/30 animate-pulse shrink-0">
                <Flame size={24} className="fill-black" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-400">
                  <Zap size={13} className="fill-amber-400" /> NC Booster Sedang
                  Aktif!
                </div>
                <h3 className="text-base font-black text-foreground tracking-tight">
                  Bonus +{Math.round((ncBoost.multiplier || 0.5) * 100)}% NC
                  Tiap Job
                </h3>
                <p className="text-xs text-muted-foreground">
                  Setiap pengiriman job yang selesai akan otomatis mendapatkan
                  bonus ekstra.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center px-4 py-2 bg-card/80 border border-amber-500/30 rounded-xl">
              <Timer
                size={16}
                className="text-amber-400 animate-spin"
                style={{ animationDuration: "6s" }}
              />
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                  Sisa Waktu
                </span>
                <span className="text-xs font-black font-mono text-amber-300">
                  {timeLeftStr || "Memuat..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Tab Selector */}
        <div className="flex items-center p-1 bg-card/60 border border-border/50 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === "ACTIVE"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Voucher Aktif (
            {vouchers.filter((v) => v.status === "ACTIVE").length})
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === "HISTORY"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Riwayat ({vouchers.filter((v) => v.status !== "ACTIVE").length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Cari kupon atau kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-card/60 border border-border/50 rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-card/60 border border-border/50 rounded-xl text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="NC_BOOSTER">⚡ NC Booster</option>
            <option value="FLEET_MAINTENANCE">Servis Armada</option>
            <option value="FLEET_BUY">Pembelian Armada</option>
            <option value="MARKET_MOD">Mod Market</option>
          </select>
        </div>
      </div>

      {/* Vouchers Grid */}
      {filteredVouchers.length === 0 ? (
        <div className="text-center py-16 bg-card/20 border border-dashed border-border/60 rounded-2xl p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <Ticket size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground">
              {activeTab === "ACTIVE"
                ? "Tidak Ada Voucher Aktif"
                : "Belum Ada Riwayat Voucher"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {activeTab === "ACTIVE"
                ? "Kupon yang Anda menangkan dari Seasonal Pass, Event, atau Giveaway akan muncul di sini."
                : "Voucher yang telah digunakan atau kadaluarsa akan diarsipkan di sini."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVouchers.map((v) => {
            const meta = getCategoryMeta(v.category);
            const Icon = meta.icon;
            const isFreeService =
              v.category === "FLEET_MAINTENANCE" &&
              v.discountType === "percentage" &&
              v.discountValue === 100;
            const isBooster = v.category === "NC_BOOSTER";

            const discBadgeText = isBooster
              ? `BOOSTER +${v.discountValue}% (${v.durationHours || 2} JAM)`
              : isFreeService
                ? "FREE SERVICE (100%)"
                : v.discountType === "percentage"
                  ? `DISKON ${v.discountValue}%`
                  : `POTONGAN ${v.discountValue.toLocaleString("id-ID")} NC`;

            return (
              <div
                key={v._id}
                className={`relative overflow-hidden rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  v.status === "ACTIVE"
                    ? isBooster
                      ? "bg-gradient-to-b from-card via-card to-amber-950/20 border-amber-500/40 hover:border-amber-400/70 shadow-lg hover:shadow-amber-500/10 hover:-translate-y-1"
                      : isFreeService
                        ? "bg-gradient-to-b from-card via-card to-emerald-950/20 border-emerald-500/40 hover:border-emerald-400/70 shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1"
                        : "bg-card/70 border-border/70 hover:border-primary/50 shadow-md hover:-translate-y-1"
                    : "bg-card/30 border-border/30 opacity-60 grayscale-[40%]"
                }`}
              >
                {/* Top Notch Decorative Header */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${meta.color}`}
                    >
                      <Icon size={12} />
                      {meta.label}
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`inline-block px-3 py-1 rounded-lg font-black text-xs uppercase tracking-wider border shadow-sm ${
                          isBooster
                            ? "bg-amber-500 text-black border-amber-400 font-extrabold"
                            : isFreeService
                              ? "bg-emerald-500 text-black border-emerald-400 font-extrabold"
                              : v.discountType === "percentage"
                                ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                                : "bg-purple-500/20 text-purple-300 border-purple-500/40"
                        }`}
                      >
                        {discBadgeText}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-base font-black text-foreground tracking-tight leading-snug line-clamp-1">
                      {v.title}
                    </h4>
                    {v.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                        {v.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Perforated Divider */}
                <div className="relative flex items-center px-4 py-1">
                  <div className="w-4 h-4 rounded-full bg-background border border-border -ml-6" />
                  <div className="flex-1 border-t border-dashed border-border/60 mx-2" />
                  <div className="w-4 h-4 rounded-full bg-background border border-border -mr-6" />
                </div>

                {/* Voucher Footer Details */}
                <div className="p-5 pt-3 space-y-4 bg-muted/10">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Kode Voucher
                      </span>
                      <span className="font-mono text-xs font-black text-foreground tracking-wider">
                        {v.code}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopyCode(v.code)}
                      className="px-2.5 py-1.5 rounded-lg bg-card border border-border/60 text-muted-foreground hover:text-foreground text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                      title="Salin Kode"
                    >
                      {copiedCode === v.code ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expiration or Used Info */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium pt-1 border-t border-border/30">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {v.status === "USED" ? (
                        <span>
                          Digunakan:{" "}
                          {new Date(v.usedAt || v.createdAt).toLocaleDateString(
                            "id-ID",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      ) : v.expiresAt ? (
                        <span>
                          Berlaku s.d:{" "}
                          {new Date(v.expiresAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      ) : (
                        <span>Masa berlaku: Permanen</span>
                      )}
                    </div>

                    {v.source && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono">
                        {v.source}
                      </span>
                    )}
                  </div>

                  {/* Action Button */}
                  {v.status === "ACTIVE" && (
                    <>
                      {isBooster ? (
                        <button
                          onClick={() => handleActivateBooster(v)}
                          disabled={isActivating === v._id || isBoostActive}
                          className={`w-full py-2.5 px-4 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            isBoostActive
                              ? "bg-muted text-muted-foreground border border-border/80 cursor-not-allowed opacity-60"
                              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black shadow-md shadow-amber-500/20 disabled:opacity-50"
                          }`}
                        >
                          <Zap
                            size={14}
                            className={
                              isBoostActive
                                ? "text-muted-foreground"
                                : "fill-black"
                            }
                          />
                          <span>
                            {isActivating === v._id
                              ? "Mengaktifkan..."
                              : isBoostActive
                                ? "Booster Lain Aktif"
                                : "Aktifkan Booster"}
                          </span>
                        </button>
                      ) : (
                        <Link
                          href={meta.link}
                          className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-primary/20"
                        >
                          <span>{meta.actionLabel}</span>
                          <ArrowUpRight size={14} />
                        </Link>
                      )}
                    </>
                  )}

                  {v.status === "USED" && (
                    <div className="w-full py-2 px-3 bg-muted/40 rounded-xl text-center text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      Sudah Digunakan
                    </div>
                  )}

                  {v.status === "EXPIRED" && (
                    <div className="w-full py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center text-xs font-bold uppercase tracking-wider text-red-400 flex items-center justify-center gap-1.5">
                      <AlertCircle size={14} />
                      Sudah Kadaluarsa
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
