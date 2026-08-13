import React from "react";
import { Scratch100xData } from "@/lib/scratch100xGenerator";
import { Coins, Star, Sparkles } from "lucide-react";

interface Ticket100xLayoutProps {
  gameData: Scratch100xData;
  isRevealed: boolean;
  prizeWon: number;
}

export default function Ticket100xLayout({ gameData, isRevealed, prizeWon }: Ticket100xLayoutProps) {
  if (!gameData || !gameData.winningNumbers || !gameData.yourNumbers) return null;

  return (
    <div className="w-full h-full bg-emerald-900 flex flex-col relative overflow-hidden font-sans border-4 border-amber-500 rounded-xl shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] select-none">
      
      {/* Winning Numbers Section */}
      <div className="flex flex-col items-center bg-emerald-800/50 p-4 border-b-4 border-emerald-950">
        <p className="text-emerald-200 text-sm font-bold uppercase tracking-widest mb-3">
          Winning Numbers
        </p>
        <div className="flex justify-center gap-3">
          {gameData.winningNumbers.map((num, idx) => (
            <div 
              key={idx}
              data-scratch-target="true"
              className="w-12 h-12 rounded-full bg-slate-100 border-4 border-slate-300 shadow-inner flex items-center justify-center"
            >
              <span className="text-xl font-black text-slate-800">{num}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Your Numbers Grid */}
      <div className="flex-1 p-5">
        <p className="text-emerald-200 text-sm font-bold uppercase tracking-widest text-center mb-4">
          Your Numbers
        </p>
        <div className="grid grid-cols-3 gap-4">
          {gameData.yourNumbers.map((item, idx) => {
            const isWinner = isRevealed && item.isMatch;
            const isSpecial = item.symbol === "STAR" || item.symbol === "100X";

            return (
              <div 
                key={idx}
                data-scratch-target="true"
                className={`flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all duration-500 ${
                  isWinner 
                    ? "bg-yellow-400 border-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.8)]" 
                    : "bg-emerald-800/80 border-emerald-600/50"
                }`}
              >
                {/* Symbol */}
                <div className={`text-3xl font-black mb-2 flex items-center justify-center h-10 ${isWinner ? "text-amber-900" : "text-emerald-100"}`}>
                  {item.symbol === "STAR" ? (
                    <Star className={`w-10 h-10 ${isWinner ? "fill-amber-700" : "fill-emerald-200 opacity-50"}`} />
                  ) : item.symbol === "100X" ? (
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-6 h-6 text-amber-700" />
                      100X
                    </span>
                  ) : (
                    item.symbol
                  )}
                </div>
                
                {/* Prize */}
                <div className={`text-xs font-black uppercase tracking-wider ${isWinner ? "text-amber-800" : "text-emerald-300"}`}>
                  {item.prize.toLocaleString("id-ID")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
