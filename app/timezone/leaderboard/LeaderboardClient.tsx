"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Trophy, Flame, TrendingDown, Clock, Activity, Medal, Star, RefreshCw } from "lucide-react";
import UserBadges from "@/components/icons/UserBadges";

type LeaderboardEntry = {
  discordId: string;
  totalSpent: number;
  totalWon: number;
  totalGames: number;
  netProfit: number;
  user: {
    name: string;
    avatarUrl: string;
    isNismaraPlus: boolean;
    nismaraPlusStartedAt?: string | null;
    isManager: boolean;
    truckyRank?: string;
  };
};

type LeaderboardData = {
  winners: LeaderboardEntry[];
  losers: LeaderboardEntry[];
};

export default function LeaderboardClient() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"monthly" | "all">("monthly");
  const [tab, setTab] = useState<"winners" | "losers">("winners");

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/timezone/leaderboard?period=${period}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentList = tab === "winners" ? data?.winners : data?.losers;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <Link href="/timezone" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
            <ArrowLeft size={16} />
            Kembali ke Timezone
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl shadow-inner border border-primary/20">
              <Trophy size={28} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Leaderboard</h1>
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                <Activity size={14} className="text-primary" />
                Papan Peringkat TimeZone
              </p>
            </div>
          </div>
        </div>

        {/* Period Filter */}
        <div className="flex bg-muted/50 p-1.5 rounded-xl border border-border/50 shadow-inner w-full md:w-auto">
          <button
            onClick={() => setPeriod("monthly")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
              period === "monthly" ? "bg-card text-primary shadow-md border border-border/50" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock size={16} />
            Bulan Ini
          </button>
          <button
            onClick={() => setPeriod("all")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider transition-all ${
              period === "all" ? "bg-card text-primary shadow-md border border-border/50" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Star size={16} />
            Semua Waktu
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setTab("winners")}
          className={`relative overflow-hidden group p-6 rounded-3xl border transition-all duration-300 ${
            tab === "winners" 
              ? "bg-gradient-to-br from-emerald-500/10 to-primary/5 border-emerald-500/30 shadow-lg shadow-emerald-500/5"
              : "bg-card border-border/50 hover:border-border hover:bg-muted/30"
          }`}
        >
          {tab === "winners" && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-primary" />}
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${tab === "winners" ? "bg-emerald-500/20 text-emerald-500" : "bg-muted text-muted-foreground group-hover:text-foreground transition-colors"}`}>
              <Flame size={28} />
            </div>
            <div className="text-left">
              <h3 className={`text-xl font-black uppercase tracking-tight ${tab === "winners" ? "text-emerald-500" : "text-foreground"}`}>Top Sultan</h3>
              <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase mt-0.5">Pendapatan Tertinggi</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setTab("losers")}
          className={`relative overflow-hidden group p-6 rounded-3xl border transition-all duration-300 ${
            tab === "losers" 
              ? "bg-gradient-to-br from-red-500/10 to-orange-500/5 border-red-500/30 shadow-lg shadow-red-500/5"
              : "bg-card border-border/50 hover:border-border hover:bg-muted/30"
          }`}
        >
          {tab === "losers" && <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-orange-400" />}
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${tab === "losers" ? "bg-red-500/20 text-red-500" : "bg-muted text-muted-foreground group-hover:text-foreground transition-colors"}`}>
              <TrendingDown size={28} />
            </div>
            <div className="text-left">
              <h3 className={`text-xl font-black uppercase tracking-tight ${tab === "losers" ? "text-red-500" : "text-foreground"}`}>Top Bangkrut</h3>
              <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase mt-0.5">Kerugian Terbesar</p>
            </div>
          </div>
        </button>
      </div>

      {/* List */}
      <div className="bg-card border border-border/50 rounded-3xl shadow-xl">
        <div className="p-6 md:p-8 bg-muted/20 rounded-t-3xl border-b border-border/50 flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            {tab === "winners" ? <Medal className="text-emerald-500" size={20} /> : <TrendingDown className="text-red-500" size={20} />}
            Peringkat {tab === "winners" ? "Sultan" : "Bangkrut"}
          </h2>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="p-2 bg-background border border-border/50 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-muted/50 rounded-2xl h-24 w-full" />
            ))
          ) : !currentList || currentList.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Belum ada data permainan untuk periode ini.</p>
            </div>
          ) : (
            currentList.map((entry, idx) => {
              const isPositive = entry.netProfit >= 0;
              let rankStyle = "bg-muted text-muted-foreground border-border/50";
              if (idx === 0) rankStyle = "bg-amber-400/20 text-amber-500 border-amber-400/30 shadow-lg shadow-amber-400/10";
              else if (idx === 1) rankStyle = "bg-slate-300/20 text-slate-400 border-slate-300/30 shadow-lg shadow-slate-300/10";
              else if (idx === 2) rankStyle = "bg-amber-700/20 text-amber-700 border-amber-700/30 shadow-lg shadow-amber-700/10";

              return (
                <div 
                  key={entry.discordId} 
                  className={`flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
                    entry.discordId === "you" /* Highlight self later */ 
                    ? "bg-primary/5 border-primary/30" 
                    : "bg-background border-border/40 hover:border-border hover:bg-muted/30"
                  }`}
                >
                  {/* Rank */}
                  <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border text-xl font-black ${rankStyle}`}>
                    #{idx + 1}
                  </div>

                  {/* Profile */}
                  <div className="flex-1 flex items-center gap-4 min-w-0">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border border-border flex-shrink-0">
                      {entry.user.avatarUrl ? (
                        <Image src={entry.user.avatarUrl} alt={entry.user.name} fill className="object-cover" sizes="56px" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xl font-bold">
                          {entry.user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-foreground truncate">{entry.user.name}</h3>
                        <div className="flex-shrink-0 flex items-center">
                          <UserBadges
                            isNismaraPlus={entry.user.isNismaraPlus}
                            nismaraPlusStartedAt={entry.user.nismaraPlusStartedAt}
                            isManager={entry.user.isManager}
                            role={entry.user.isManager ? "manager" : "user"}
                            truckyRank={entry.user.truckyRank}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-2">
                        <span>Main {entry.totalGames}x</span>
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-border/50">
                    <div className="text-left md:text-right hidden sm:block">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Win / Spent</p>
                      <p className="text-xs font-medium text-foreground">
                        {entry.totalWon.toLocaleString("id-ID")} / {entry.totalSpent.toLocaleString("id-ID")}
                      </p>
                    </div>
                    
                    <div className="text-right bg-muted/40 px-4 py-2 rounded-xl border border-border/50">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">Net Profit</p>
                      <p className={`text-base md:text-lg font-black tracking-tight ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                        {isPositive ? "+" : ""}{entry.netProfit.toLocaleString("id-ID")} NC
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
