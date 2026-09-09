"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  Gift,
  ArrowLeft,
  Calendar,
  Ticket,
  Trophy,
  Coins,
  Sparkles,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Zap,
  Lock,
  Plus,
  Minus,
  Check,
} from "lucide-react";
import { showAlert, showConfirm } from "@/lib/dialog";

interface GiveawayPublicDetailClientProps {
  giveaway: any;
}

export default function GiveawayPublicDetailClient({
  giveaway,
}: GiveawayPublicDetailClientProps) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  // Progress state
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [progressData, setProgressData] = useState<any>(null);

  // Buy Ticket Modal state
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [isBuying, setIsBuying] = useState(false);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);

  const fetchProgress = async () => {
    if (!session?.user) return;
    setLoadingProgress(true);
    try {
      const res = await fetch(`/api/giveaways/${giveaway._id}/progress`, {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setProgressData(data);
      }
    } catch (err) {
      console.error("Error fetching giveaway progress:", err);
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchProgress();
    }
  }, [session, giveaway._id]);

  // Klaim Tiket Quest
  const handleClaimQuest = async (questId: string) => {
    setIsClaiming(questId);
    try {
      const res = await fetch(`/api/giveaways/${giveaway._id}/claim-quest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ questId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        await showAlert(data.error || "Gagal mengklaim tiket misi.");
      } else {
        await showAlert(data.message || "Selamat! Tiket undian berhasil diklaim.");
        fetchProgress();
        router.refresh();
      }
    } catch (err) {
      await showAlert("Terjadi gangguan jaringan saat mengklaim tiket.");
    } finally {
      setIsClaiming(null);
    }
  };

  // Beli Tiket Ekstra
  const handleBuyTickets = async () => {
    if (!progressData) return;

    const unitPrice = progressData.effectiveTicketPrice || giveaway.ticketPriceNC || 1000;
    const totalCost = unitPrice * buyQuantity;

    const confirmed = await showConfirm(
      `Apakah Anda yakin ingin membeli ${buyQuantity}x Tiket Giveaway seharga ${totalCost.toLocaleString("id-ID")} NC?`
    );
    if (!confirmed) return;

    setIsBuying(true);
    try {
      const res = await fetch(`/api/giveaways/${giveaway._id}/buy-ticket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({ quantity: buyQuantity }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        await showAlert(data.error || "Gagal membeli tiket undian.");
      } else {
        await showAlert(data.message || "Tiket undian berhasil dibeli!");
        setShowBuyModal(false);
        setBuyQuantity(1);
        fetchProgress();
        router.refresh();
      }
    } catch (err) {
      await showAlert("Terjadi gangguan jaringan saat membeli tiket.");
    } finally {
      setIsBuying(false);
    }
  };

  const isOngoing = giveaway.status === "ongoing";
  const isCompleted = giveaway.status === "completed";
  const startStr = giveaway.startDate
    ? new Date(giveaway.startDate).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    : "-";
  const endStr = giveaway.endDate
    ? new Date(giveaway.endDate).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " WIB"
    : "-";

  return (
    <main className="min-h-screen pt-28 pb-24 relative bg-background overflow-x-hidden">
      {/* Glow Backdrops */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-96 bg-primary/10 blur-3xl rounded-b-full pointer-events-none" />
      <div className="absolute top-72 right-10 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10 space-y-10">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/giveaways"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors p-2 rounded-xl hover:bg-card"
          >
            <ArrowLeft size={16} /> Kembali ke Direktori
          </Link>

          <div>
            {isOngoing && (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse">
                <Sparkles size={14} /> Event Sedang Berlangsung
              </span>
            )}
            {isCompleted && (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <Crown size={14} /> Event Telah Selesai
              </span>
            )}
            {giveaway.status === "scheduled" && (
              <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
                <Clock size={14} /> Akan Datang
              </span>
            )}
          </div>
        </div>

        {/* Hero Banner Card */}
        <div className="relative rounded-3xl overflow-hidden border border-border/80 shadow-2xl bg-card/60">
          <div className="h-64 sm:h-80 w-full relative overflow-hidden bg-black/60">
            {giveaway.bannerUrl ? (
              <img
                src={giveaway.bannerUrl}
                alt={giveaway.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 via-card to-background">
                <Gift size={72} className="text-primary/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

            {/* Banner Text Overlay */}
            <div className="absolute bottom-6 left-6 right-6 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-white">
                <Calendar size={13} className="text-primary" />
                {startStr} — {endStr}
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight uppercase drop-shadow-md">
                {giveaway.title}
              </h1>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-4">
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {giveaway.description || "Ikuti event giveaway musim ini, selesaikan misi pengantaran kargo, dan menangkan berbagai paket hadiah fantastis!"}
            </p>

            {/* Quick Rules Pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                {!giveaway.allowMultipleWins ? "✓ 1 Driver Maksimal 1 Juara (Fair Play)" : "✓ Multi-Win Diizinkan"}
              </span>
              {giveaway.enableQuests && (
                <span className="px-3 py-1 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold">
                  ✓ Tiket Gratis dari Misi Game
                </span>
              )}
              {giveaway.enableNcPurchase && (
                <span className="px-3 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold flex items-center gap-1">
                  <Zap size={12} /> Diskon 20% Beli Tiket (N+ & Booster)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Podium Juara (Jika Selesai) */}
        {isCompleted && giveaway.winners && giveaway.winners.length > 0 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-amber-500/15 via-card/70 to-card/50 border border-amber-500/30 shadow-2xl space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-1">
              <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-2">
                <Crown size={32} />
              </div>
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">
                Podium Juara Giveaway
              </h2>
              <p className="text-xs text-muted-foreground">
                Selamat kepada seluruh pengemudi beruntung yang berhasil memenangkan undian! Hadiah telah masuk secara otomatis ke akun masing-masing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {giveaway.winners.map((w: any, idx: number) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-black/40 border border-amber-500/20 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={w.avatarUrl || "/avatar-default.png"}
                        alt={w.name}
                        className="w-12 h-12 rounded-full border-2 border-amber-400/50 object-cover"
                      />
                      <div>
                        <h4 className="text-sm font-black text-foreground">{w.name}</h4>
                        <span className="text-xs font-mono font-bold text-amber-400">
                          Tiket #{w.ticketNumber}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-400 font-black text-xs uppercase tracking-wider">
                      {w.tierTitle || `Tier ${w.tier}`}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Hadiah Diterima:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {w.rewards?.map((r: any, rIdx: number) => (
                        <span
                          key={rIdx}
                          className="px-2.5 py-1 rounded-lg bg-white/5 text-xs font-semibold text-white/90 border border-white/10"
                        >
                          {r.title}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Tiket Saya */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card/60 border border-border/80 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Ticket size={22} className="text-sky-400" /> Lembar Tiket Saya
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Koleksi nomor undian resmi Anda untuk pengundian hadiah giveaway ini.
              </p>
            </div>

            {isOngoing && giveaway.enableNcPurchase && (
              <button
                onClick={() => setShowBuyModal(true)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-amber-500/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Coins size={16} /> Beli Tiket Ekstra (NC)
              </button>
            )}
          </div>

          {!session?.user ? (
            <div className="text-center py-10 px-4 rounded-2xl bg-black/30 border border-border/60 space-y-3">
              <Lock size={32} className="mx-auto text-muted-foreground" />
              <h4 className="text-sm font-bold text-foreground">Masuk untuk Memeriksa Tiket & Progres Anda</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Silakan login menggunakan akun Discord VTC Anda untuk melihat tiket yang telah dikantongi dan menyelesaikan misi pengantaran kargo.
              </p>
              <button
                onClick={() => signIn("discord")}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/25"
              >
                Login Discord Sekarang
              </button>
            </div>
          ) : loadingProgress ? (
            <div className="py-10 text-center text-xs text-muted-foreground animate-pulse">
              Memuat data tiket dan progres misi Anda...
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stat Summary Driver */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-black/40 border border-border/60 text-center">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Tiket</span>
                  <p className="text-xl font-black text-sky-400 tabular-nums">
                    {progressData?.totalUserTickets || 0}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Tiket Misi</span>
                  <p className="text-xl font-black text-emerald-400 tabular-nums">
                    {progressData?.questTicketsCount || 0}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Tiket Beli NC</span>
                  <p className="text-xl font-black text-amber-400 tabular-nums">
                    {progressData?.purchasedTicketsCount || 0}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Status Perks</span>
                  <p className="text-xs font-black text-foreground mt-1">
                    {progressData?.discountApplied ? (
                      <span className="text-amber-400 flex items-center justify-center gap-1">
                        <Sparkles size={12} /> Diskon 20% Aktif
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Harga Standar</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Badges of User Tickets */}
              {progressData?.userTickets && progressData.userTickets.length > 0 ? (
                <div className="p-4 rounded-2xl bg-black/20 border border-border/50">
                  <span className="text-[11px] font-bold text-muted-foreground block mb-2">Nomor Seri Tiket Anda:</span>
                  <div className="flex flex-wrap gap-2">
                    {progressData.userTickets.map((tNum: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-xs font-black tracking-wider flex items-center gap-1.5 shadow-sm"
                      >
                        <Ticket size={12} /> #{tNum}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Anda belum memiliki tiket undian. Selesaikan misi pengantaran di bawah untuk mendapatkan tiket gratis!
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section: Misi Pengantaran (Tiket Gratis) */}
        {giveaway.enableQuests && giveaway.quests && giveaway.quests.length > 0 && (
          <div className="p-6 sm:p-8 rounded-3xl bg-card/60 border border-border/80 shadow-xl space-y-6">
            <div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={22} className="text-primary" /> Misi Pengantaran Game (Tiket Gratis)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Selesaikan pekerjaan kargo selama periode giveaway untuk mengklaim tiket undian gratis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(progressData?.quests || giveaway.quests).map((q: any) => {
                const isCompleted = q.isCompleted;
                const isClaimed = q.isClaimed;
                const progressPct = q.progressPercentage || 0;

                return (
                  <div
                    key={q.questId}
                    className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                      isClaimed
                        ? "bg-emerald-500/5 border-emerald-500/25"
                        : isCompleted
                        ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10"
                        : "bg-black/30 border-border/60"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-black text-foreground">{q.title}</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          +{q.rewardTickets || 1} Tiket
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {q.description}
                      </p>
                    </div>

                    {/* Progress Bar & Value */}
                    <div className="space-y-2">
                      {session?.user && (
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                            <span className="text-muted-foreground">Progres Pengantaran:</span>
                            <span className="font-mono text-foreground">
                              {(q.currentValue || 0).toLocaleString("id-ID")} / {(q.target || 1).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCompleted ? "bg-emerald-500" : "bg-primary"
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Claim Button */}
                      {isOngoing && session?.user && (
                        <div className="pt-2">
                          {isClaimed ? (
                            <button
                              disabled
                              className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-wider border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-default"
                            >
                              <CheckCircle2 size={14} /> Tiket Sudah Diklaim
                            </button>
                          ) : isCompleted ? (
                            <button
                              onClick={() => handleClaimQuest(q.questId)}
                              disabled={isClaiming === q.questId}
                              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 animate-bounce hover:scale-[1.02]"
                            >
                              <Sparkles size={14} />
                              {isClaiming === q.questId ? "Mengklaim..." : "Klaim Tiket Sekarang!"}
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full py-2.5 rounded-xl bg-muted/60 text-muted-foreground font-bold text-xs uppercase tracking-wider border border-border cursor-not-allowed"
                            >
                              Selesaikan Misi di Game
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section: Showcase Tingkatan Hadiah */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card/60 border border-border/80 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Trophy size={22} className="text-amber-400" /> Tingkatan Hadiah (Prize Tiers)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rincian total hadiah yang akan diundi dan disalurkan ke para pemenang.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {giveaway.prizes?.map((tier: any) => (
              <div
                key={tier.tier}
                className="p-5 rounded-2xl bg-black/40 border border-border/70 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400 font-black text-xs uppercase tracking-wider">
                      {tier.tierTitle || `Tier ${tier.tier}`}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-muted-foreground">
                    Kuota: <strong className="text-foreground">{tier.winnerCount || 1} Pengemudi</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {tier.rewards?.map((r: any, rIdx: number) => (
                    <div
                      key={rIdx}
                      className="p-3 rounded-xl bg-card/70 border border-border/60 flex items-center gap-2.5"
                    >
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                        <Gift size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <h5 className="text-xs font-black text-foreground truncate">{r.title}</h5>
                        {r.description && (
                          <p className="text-[11px] text-muted-foreground truncate">{r.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Beli Tiket Ekstra via NC */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                <Coins size={20} className="text-amber-400" /> Beli Tiket Ekstra
              </h3>
              <button
                onClick={() => setShowBuyModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Perbesar peluang kemenangan Anda dengan membeli nomor undian tambahan menggunakan Nismara Coin.
            </p>

            {/* Price Breakdown */}
            <div className="p-4 rounded-2xl bg-black/40 border border-border/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Harga Tiket Dasar:</span>
                <span className="font-mono font-bold text-foreground">
                  {(giveaway.ticketPriceNC || 1000).toLocaleString("id-ID")} NC
                </span>
              </div>

              {progressData?.discountApplied && (
                <div className="flex items-center justify-between text-xs text-amber-400">
                  <span className="flex items-center gap-1 font-bold">
                    <Sparkles size={12} /> Diskon 20% (N+ / Booster):
                  </span>
                  <span className="font-mono font-bold">
                    -{Math.round((giveaway.ticketPriceNC || 1000) * 0.2).toLocaleString("id-ID")} NC
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-sm">
                <span className="font-bold text-foreground">Harga Efektif per Tiket:</span>
                <span className="font-mono font-black text-amber-400">
                  {(progressData?.effectiveTicketPrice || giveaway.ticketPriceNC || 1000).toLocaleString("id-ID")} NC
                </span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Jumlah Tiket yang Dibeli:</label>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-border">
                <button
                  type="button"
                  onClick={() => setBuyQuantity(Math.max(1, buyQuantity - 1))}
                  className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-card/80 transition-all"
                >
                  <Minus size={16} />
                </button>
                <span className="text-xl font-black text-foreground font-mono">{buyQuantity}</span>
                <button
                  type="button"
                  onClick={() => {
                    const maxAllowed = giveaway.maxPurchasableTickets || 5;
                    const alreadyBought = progressData?.purchasedTicketsCount || 0;
                    const sisa = maxAllowed > 0 ? maxAllowed - alreadyBought : 99;
                    setBuyQuantity(Math.min(sisa, buyQuantity + 1));
                  }}
                  className="p-2 rounded-xl bg-card border border-border text-foreground hover:bg-card/80 transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>
              {giveaway.maxPurchasableTickets > 0 && (
                <span className="text-[11px] text-muted-foreground block text-right">
                  Batas maks: {giveaway.maxPurchasableTickets} tiket per pengemudi.
                </span>
              )}
            </div>

            {/* Total Cost */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/10 border border-primary/25">
              <span className="text-xs font-bold text-foreground">Total NC Dibutuhkan:</span>
              <span className="text-lg font-black text-primary font-mono">
                {(
                  (progressData?.effectiveTicketPrice || giveaway.ticketPriceNC || 1000) * buyQuantity
                ).toLocaleString("id-ID")}{" "}
                NC
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowBuyModal(false)}
                className="flex-1 py-3 rounded-2xl bg-card border border-border text-foreground font-bold text-xs uppercase tracking-wider"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleBuyTickets}
                disabled={isBuying}
                className="flex-1 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {isBuying ? "Memproses..." : "Konfirmasi Beli"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
