import React from 'react';
import { Gem } from 'lucide-react';

export default function ServerBoosterBadge({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <div className="group/booster relative inline-flex items-center justify-center cursor-help ml-1.5 align-middle">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-fuchsia-400/50 blur-sm rounded-full scale-150 opacity-0 group-hover/booster:opacity-100 transition-opacity duration-300" />
      <Gem 
        className={`${className} text-fuchsia-400 fill-fuchsia-400 drop-shadow-[0_0_4px_rgba(232,121,249,0.6)] relative z-10 transition-transform duration-300 group-hover/booster:scale-110`}
      />
      {/* Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 bg-black/95 text-fuchsia-400 text-[10px] font-bold rounded-md opacity-0 group-hover/booster:opacity-100 transition-all duration-300 -translate-y-1 group-hover/booster:translate-y-0 whitespace-nowrap pointer-events-none border border-fuchsia-400/30 shadow-[0_0_10px_rgba(232,121,249,0.2)] z-[9999]">
        Server Booster
      </div>
    </div>
  );
}
