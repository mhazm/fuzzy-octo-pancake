"use client";

import { useState, useMemo } from "react";
import {
  Trophy,
  Medal,
  Coins,
  Truck,
  AlertTriangle,
  Package,
  Crown,
  Star,
} from "lucide-react";

export default function LeaderboardUI({
  precalculatedData,
}: {
  precalculatedData: any;
}) {
  const [category, setCategory] = useState<
    "nc" | "distance" | "points" | "jobs" | "mass"
  >("nc");
  const [period, setPeriod] = useState<"all" | "monthly">("monthly");

  // Langsung ambil data matang dari prop, tidak perlu hitung ulang
  const leaderboardData = precalculatedData?.[period]?.[category] || [];

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return {
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/50",
          text: "text-yellow-500",
          icon: <Crown size={24} />,
        };
      case 1:
        return {
          bg: "bg-slate-300/10",
          border: "border-slate-300/50",
          text: "text-slate-300",
          icon: <Medal size={24} />,
        };
      case 2:
        return {
          bg: "bg-orange-600/10",
          border: "border-orange-600/50",
          text: "text-orange-600",
          icon: <Medal size={24} />,
        };
      default:
        return {
          bg: "bg-white/5",
          border: "border-white/5",
          text: "text-foreground/20",
          icon: <span className="font-black">#{index + 1}</span>,
        };
    }
  };

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-5xl font-black text-(-primary-foreground) tracking-tighter uppercase">
            Driver <span className="text-accent-sky">Leaderboard</span>
          </h1>
          <p className="text-foreground/40 font-bold uppercase text-[10px] tracking-[0.3em] ml-1">
            Performance & Achievement
          </p>
        </div>

        <div className="flex bg-card p-1.5 rounded-2xl border border-border shadow-2xl">
          <button
            onClick={() => setPeriod("monthly")}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${period === "monthly" ? "bg-primary text-white shadow-xl" : "text-foreground/40 hover:text-white"}`}
          >
            This Month
          </button>
          <button
            onClick={() => setPeriod("all")}
            className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${period === "all" ? "bg-primary text-white shadow-xl" : "text-foreground/40 hover:text-white"}`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* CATEGORIES GRID */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            id: "nc",
            label: "NC Earned",
            icon: <Coins size={20} />,
            color: "text-emerald-400",
          },
          {
            id: "distance",
            label: "Kilometers",
            icon: <Truck size={20} />,
            color: "text-accent-sky",
          },
          {
            id: "mass",
            label: "Tonnage",
            icon: <Package size={20} />,
            color: "text-orange-400",
          },
          {
            id: "jobs",
            label: "Jobs Done",
            icon: <Star size={20} />,
            color: "text-yellow-400",
          },
          {
            id: "points",
            label: "Penalties",
            icon: <AlertTriangle size={20} />,
            color: "text-red-500",
          },
        ].map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`p-6 rounded-[2.5rem] border transition-all flex flex-col items-center gap-3 group ${category === cat.id ? "bg-card border-primary shadow-[0_0_40px_rgba(var(--primary),0.1)] scale-105" : "bg-card/40 border-border opacity-40 hover:opacity-100 hover:bg-card"}`}
          >
            <div
              className={`${cat.color} group-hover:scale-110 transition-transform`}
            >
              {cat.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {cat.label}
            </span>
          </button>
        ))}
      </div>

      {/* TOP 3 PODIUM (Optional/Future) - Kita langsung ke List untuk Detail */}
      <div className="space-y-3">
        {leaderboardData.map((row: any, index: number) => {
          const style = getRankStyle(index);
          const unit =
            category === "nc"
              ? "N¢"
              : category === "distance"
                ? "KM"
                : category === "mass"
                  ? "Tons"
                  : category === "jobs"
                    ? "Jobs"
                    : "Points";

          return (
            <div
              key={row.userId}
              className={`flex items-center justify-between p-5 px-10 rounded-[2.5rem] border transition-all hover:translate-x-2 group ${style.bg} ${style.border}`}
            >
              <div className="flex items-center gap-8">
                <div className={`w-12 flex justify-center ${style.text}`}>
                  {style.icon}
                </div>
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img
                      src={
                        row.image ||
                        `https://ui-avatars.com/api/?name=${row.name}&background=6D28D9&color=fff`
                      }
                      className="w-14 h-14 rounded-full border-2 border-white/10 object-cover"
                      alt=""
                    />
                    {index === 0 && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                        <Star size={10} className="text-black" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-black text-(-primary-foreground) uppercase text-lg tracking-tight leading-none mb-1 group-hover:text-accent-sky transition-colors">
                      {row.name}
                    </p>
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                      ID: #{row.truckyId || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p
                  className={`text-3xl font-black tabular-nums leading-none mb-1 ${index < 3 ? style.text : "text-(-primary-foreground)"}`}
                >
                  {category === "nc" && (
                    <span className="text-sm mr-1 not-italic">N¢</span>
                  )}
                  {row.total.toLocaleString("id-ID")}
                  {category !== "nc" && (
                    <span className="text-[10px] ml-2 not-italic font-black text-foreground/20">
                      {unit}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}

        {leaderboardData.length === 0 && (
          <div className="py-20 text-center opacity-10 font-black uppercase tracking-widest">
            No record data found for this period
          </div>
        )}
      </div>
    </div>
  );
}
