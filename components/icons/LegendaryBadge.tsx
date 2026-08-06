import React from "react";
import { Crown } from "lucide-react";

export default function LegendaryBadge({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <div className="group/legendary relative inline-flex items-center justify-center cursor-help ml-1.5 align-middle">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-orange-500/50 blur-sm rounded-full scale-150 opacity-0 group-hover/legendary:opacity-100 transition-opacity duration-300" />
      
      {/* 1. Ikon Badge (Bisa pakai SVG, Lucide Icon, atau Gambar) */}
      <div
        className={`${className} flex items-center justify-center relative z-10 transition-transform duration-300 group-hover/legendary:scale-110 text-orange-500 drop-shadow-[0_0_4px_rgba(249,115,22,0.6)]`}
      >
        <Crown className="w-full h-full fill-orange-500/20" />
      </div>

      {/* 2. Tooltip (Muncul saat di hover) */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 bg-black/95 text-orange-400 text-[10px] font-bold rounded-md opacity-0 group-hover/legendary:opacity-100 transition-all duration-300 -translate-y-1 group-hover/legendary:translate-y-0 whitespace-nowrap pointer-events-none border border-orange-400/30 z-[9999]">
        Legendary Driver
      </div>
    </div>
  );
}
