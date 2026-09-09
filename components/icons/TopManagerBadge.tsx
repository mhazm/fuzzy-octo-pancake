"use client";

import React from "react";
import { Crown } from "lucide-react";

interface TopManagerBadgeProps {
  className?: string;
  month?: string | null; // e.g. "2026-08"
}

export default function TopManagerBadge({
  className = "w-4 h-4",
  month,
}: TopManagerBadgeProps) {
  const formatMonth = (mStr?: string | null) => {
    if (!mStr || !mStr.includes("-")) return null;
    const [year, m] = mStr.split("-");
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const idx = parseInt(m, 10) - 1;
    return `${monthNames[idx] || m} ${year}`;
  };

  const periodLabel = formatMonth(month);

  return (
    <div className="group/topmanager relative inline-flex items-center justify-center cursor-help ml-1.5 align-middle">
      {/* Golden Glow effect */}
      <div className="absolute inset-0 bg-amber-500/50 blur-sm rounded-full scale-150 opacity-40 group-hover/topmanager:opacity-100 transition-opacity duration-300" />

      {/* Crown Icon with gold gradient styling */}
      <Crown
        className={`${className} text-amber-400 fill-amber-400/30 drop-shadow-[0_0_6px_rgba(245,158,11,0.85)] relative z-10 transition-transform duration-300 group-hover/topmanager:scale-110`}
      />

      {/* Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1 bg-zinc-950 text-amber-300 text-[10px] font-bold rounded-lg opacity-0 group-hover/topmanager:opacity-100 transition-all duration-300 -translate-y-1 group-hover/topmanager:translate-y-0 whitespace-nowrap pointer-events-none border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)] z-[9999] flex flex-col items-center">
        <div className="flex items-center gap-1 text-amber-400 font-extrabold uppercase tracking-wide">
          <span>👑 Top Manager</span>
        </div>
        <span className="text-[9px] text-zinc-400 font-normal">
          {periodLabel ? `Periode (${periodLabel})` : "Pencapaian 100 Poin KPI"}
        </span>
      </div>
    </div>
  );
}
