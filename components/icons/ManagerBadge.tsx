import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function ManagerBadge({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <div className="group/manager relative inline-flex items-center justify-center cursor-help ml-1.5 align-middle">
      {/* Glow effect */}
      <div className="absolute inset-0 bg-purple-500/50 blur-sm rounded-full scale-150 opacity-0 group-hover/manager:opacity-100 transition-opacity duration-300" />
      <ShieldCheck 
        className={`${className} text-purple-400 fill-purple-500/20 drop-shadow-[0_0_4px_rgba(168,85,247,0.6)] relative z-10 transition-transform duration-300 group-hover/manager:scale-110`}
      />
      {/* Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 bg-black/95 text-purple-400 text-[10px] font-bold rounded-md opacity-0 group-hover/manager:opacity-100 transition-all duration-300 -translate-y-1 group-hover/manager:translate-y-0 whitespace-nowrap pointer-events-none border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)] z-[9999]">
        Nismara Manager
      </div>
    </div>
  );
}
