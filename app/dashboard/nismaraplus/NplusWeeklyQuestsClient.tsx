"use client";

import React, { useState, useTransition } from "react";
import {
  Sparkles,
  Trophy,
  Clock,
  CheckCircle2,
  Lock,
  Flame,
  Truck,
  Weight,
  Compass,
  ShieldCheck,
  Zap,
  Gift,
  Coins,
  Fuel,
  Ticket,
  Percent,
  ChevronRight,
  RefreshCw,
  Loader2,
  Calendar,
  Globe,
} from "lucide-react";
import { claimWeeklyQuestAction, getWeeklyQuestsAction } from "@/app/actions/nplusQuestActions";
import { showAlert } from "@/lib/dialog";
import { useRouter } from "next/navigation";
import { WeeklyQuestProgressResponse, UserQuestProgressItem } from "@/lib/nplusWeeklyQuest";

interface NplusWeeklyQuestsClientProps {
  initialData: WeeklyQuestProgressResponse;
}

export default function NplusWeeklyQuestsClient({ initialData }: NplusWeeklyQuestsClientProps) {
  const router = useRouter();
  const [data, setData] = useState<WeeklyQuestProgressResponse>(initialData);
  const [isPending, startTransition] = useTransition();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await getWeeklyQuestsAction(true);
      if (refreshed.success) {
        setData(refreshed);
      }
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClaim = async (quest: UserQuestProgressItem) => {
    if (!data.isNplusActive) {
      await showAlert("Quest Mingguan hanya berlaku untuk Member Nismara Plus aktif.", "Akses Terkunci");
      return;
    }

    if (!quest.isCompleted) {
      await showAlert(`Syarat quest belum tercapai (${quest.currentValue}/${quest.target}).`, "Belum Selesai");
      return;
    }

    if (quest.isClaimed) {
      await showAlert("Hadiah untuk quest ini sudah Anda klaim.", "Sudah Diklaim");
      return;
    }

    setClaimingId(quest.questId);

    try {
      const res = await claimWeeklyQuestAction(quest.questId);
      if (res.success) {
        await showAlert(res.message || "Hadiah berhasil diklaim!", "🎉 Klaim Berhasil");
        // Update state lokal
        setData((prev) => {
          const updatedQuests = prev.quests.map((q) =>
            q.questId === quest.questId ? { ...q, isClaimed: true, claimedAt: new Date().toISOString() } : q
          );
          return {
            ...prev,
            quests: updatedQuests,
            totalClaimed: prev.totalClaimed + 1,
          };
        });
        startTransition(() => {
          router.refresh();
        });
      } else {
        await showAlert(res.error || "Gagal mengklaim hadiah.", "Gagal Klaim");
      }
    } catch (err: any) {
      await showAlert(err?.message || "Terjadi kesalahan saat mengklaim.", "Error");
    } finally {
      setClaimingId(null);
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "EASY":
        return <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Easy</span>;
      case "HARD":
        return <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">Hardcore</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Medium</span>;
    }
  };

  const getQuestIcon = (type: string) => {
    switch (type) {
      case "HEAVY_CARGO":
        return <Weight className="w-5 h-5 text-amber-400" />;
      case "LONG_HAUL":
        return <Compass className="w-5 h-5 text-cyan-400" />;
      case "TOTAL_DISTANCE":
        return <Zap className="w-5 h-5 text-indigo-400" />;
      case "PERFECT_DELIVERY":
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case "HARDCORE_JOB":
        return <Flame className="w-5 h-5 text-rose-400" />;
      case "TRUCKERSMP_JOB":
        return <Globe className="w-5 h-5 text-purple-400" />;
      default:
        return <Truck className="w-5 h-5 text-blue-400" />;
    }
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "NC":
        return <Coins className="w-4 h-4 text-amber-400" />;
      case "SAFEBOX_TICKET":
        return <Ticket className="w-4 h-4 text-rose-400" />;
      case "FUEL":
        return <Fuel className="w-4 h-4 text-cyan-400" />;
      case "VOUCHER":
      default:
        return <Percent className="w-4 h-4 text-emerald-400" />;
    }
  };

  const formatUnit = (type: string, val: number, target: number) => {
    switch (type) {
      case "TOTAL_DISTANCE":
        return `${val.toLocaleString("id-ID")} / ${target.toLocaleString("id-ID")} KM`;
      case "HEAVY_CARGO":
        return `${val} / ${target} Job (≥ 20T)`;
      case "LONG_HAUL":
        return `${val} / ${target} Job (≥ 1.000 KM)`;
      case "PERFECT_DELIVERY":
        return `${val} / ${target} Job (0% Damage)`;
      case "HARDCORE_JOB":
        return `${val} / ${target} Job Hardcore`;
      case "TRUCKERSMP_JOB":
        return `${val} / ${target} Job (TruckersMP)`;
      default:
        return `${val} / ${target} Job`;
    }
  };

  const weekInfo = data.weekInfo || {};

  return (
    <div className="space-y-6">
      {/* Header Banner Quest */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card/90 to-amber-950/20 border border-amber-400/20 p-6 md:p-8 shadow-xl">
        {/* Background glow & accents */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Nismara+ Exclusive
              </span>
              <span className="bg-muted border border-border text-muted-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Minggu ke-{weekInfo.weekNumber || 1} ({weekInfo.weekKey || "2026-W36"})
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
              <Trophy className="text-amber-400 h-7 w-7 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
              Weekly Quests & Rewards
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              Selesaikan tantangan mingguan khusus member Nismara Plus untuk memenangkan kupon diskon servis, bonus NC, tiket Safebox penalti, dan fuel garasi.
            </p>
          </div>

          {/* Countdown Timer Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start md:self-center">
            <div className="bg-background/80 backdrop-blur border border-border/80 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-inner">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reset Mingguan</p>
                <p className="text-sm font-black text-foreground">
                  {weekInfo.daysRemaining !== undefined ? (
                    `${weekInfo.daysRemaining}h ${weekInfo.hoursRemaining}j ${weekInfo.minutesRemaining}m lagi`
                  ) : (
                    "Tiap Senin 00:00 WIB"
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Perbarui data quest"
              className="p-3 rounded-2xl bg-secondary/80 hover:bg-secondary border border-border text-foreground transition-all flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin text-amber-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Progress Overview Bar */}
        <div className="mt-6 pt-6 border-t border-border/50 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Progress Anda:</span>
            <span className="text-foreground font-black text-sm">
              {data.totalCompleted} / {data.quests.length} Quest Terselesaikan
            </span>
            <span className="text-amber-400">({data.totalClaimed} Sudah Diklaim)</span>
          </div>
          {!data.isNplusActive && (
            <span className="text-rose-400 flex items-center gap-1.5 font-bold">
              <Lock className="w-3.5 h-3.5" /> Berlangganan Nismara+ untuk membuka klaim hadiah
            </span>
          )}
        </div>
      </div>

      {/* Grid Kartu Quest */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.quests.map((quest, idx) => {
          const isClaimingThis = claimingId === quest.questId;

          return (
            <div
              key={quest.questId || idx}
              className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all duration-300 ${
                quest.isClaimed
                  ? "bg-card/40 border-emerald-500/30 opacity-90"
                  : quest.isCompleted
                  ? "bg-gradient-to-b from-card to-amber-950/10 border-amber-400/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-400/30"
                  : "bg-card border-border/80 hover:border-amber-400/30"
              }`}
            >
              {/* Header Kartu */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center shadow-inner">
                    {getQuestIcon(quest.type)}
                  </div>
                  <div className="flex items-center gap-2">
                    {getDifficultyBadge(quest.difficulty)}
                    {quest.isClaimed && (
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Claimed
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight group-hover:text-amber-400 transition-colors">
                    {quest.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {quest.description}
                  </p>
                </div>

                {/* Progress Bar Container */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Progres Job</span>
                    <span className={quest.isCompleted ? "text-emerald-400 font-extrabold" : "text-foreground font-black"}>
                      {formatUnit(quest.type, quest.currentValue, quest.target)}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden border border-border/50">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        quest.isCompleted
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : "bg-gradient-to-r from-amber-500 to-primary"
                      }`}
                      style={{ width: `${quest.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Reward Preview Box */}
                <div className="rounded-2xl bg-secondary/40 border border-border/60 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-amber-400" /> Hadiah Quest
                    </span>
                    <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center">
                      {getRewardIcon(quest.reward?.type)}
                    </div>
                  </div>
                  <p className="text-sm font-black text-foreground">{quest.reward?.title}</p>
                  {quest.reward?.description && (
                    <p className="text-[11px] text-muted-foreground leading-tight">{quest.reward.description}</p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-border/40">
                {!data.isNplusActive ? (
                  <button
                    onClick={() => showAlert("Upgrade akun ke Nismara+ untuk membuka reward quest mingguan!", "Nismara+ Diperlukan")}
                    className="w-full py-2.5 px-4 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-amber-400" /> Buka Kunci Nismara+
                  </button>
                ) : quest.isClaimed ? (
                  <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Hadiah Sudah Masuk
                  </div>
                ) : quest.isCompleted ? (
                  <button
                    onClick={() => handleClaim(quest)}
                    disabled={isClaimingThis}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 disabled:opacity-50 cursor-pointer animate-pulse"
                  >
                    {isClaimingThis ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Memproses Klaim...
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4" /> Klaim Hadiah Sekarang
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full py-2.5 px-4 rounded-xl bg-secondary/50 border border-border text-muted-foreground text-xs font-bold flex items-center justify-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> {quest.progressPercentage}% Selesai
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
