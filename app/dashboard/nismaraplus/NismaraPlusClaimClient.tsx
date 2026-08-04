"use client";

import React, { useState, useEffect } from "react";
import { Gift, Coins, ShieldAlert, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface NismaraPlusClaimProps {
  lastClaimAt: string | null;
}

export default function NismaraPlusClaimClient({ lastClaimAt }: NismaraPlusClaimProps) {
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!lastClaimAt) {
      setIsReady(true);
      return;
    }

    const last = new Date(lastClaimAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - last.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const COOLDOWN = 30;
    if (diffDays > COOLDOWN) {
      setIsReady(true);
    } else {
      setIsReady(false);
      setDaysRemaining(COOLDOWN - diffDays + 1);
    }
  }, [lastClaimAt]);

  const handleClaim = async () => {
    setIsClaiming(true);
    setClaimStatus("idle");

    try {
      const res = await fetch("/api/nismaraplus/claim", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setClaimStatus("success");
        setMessage(data.message);
        setIsReady(false);
        setDaysRemaining(30);
        setTimeout(() => {
          router.refresh();
        }, 3000);
      } else {
        setClaimStatus("error");
        setMessage(data.error || "Gagal melakukan klaim bulanan.");
      }
    } catch (err) {
      setClaimStatus("error");
      setMessage("Terjadi kesalahan sistem saat menghubungi server.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="bg-linear-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-xl shadow-amber-500/5 relative overflow-hidden flex flex-col md:flex-row items-center gap-8 justify-between">
      {/* Decorative Icon */}
      <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none rotate-12">
        <Gift className="w-48 h-48 text-amber-500" />
      </div>

      <div className="flex-1 space-y-4 relative z-10 w-full text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl">
            <Gift size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-amber-500 tracking-wide uppercase">Hadiah Bulanan Nismara+</h3>
            <p className="text-sm text-foreground/70 font-medium">Klaim bonus rutin khusus untuk member VIP aktif.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
          <div className="flex items-center gap-2 bg-background/50 border border-amber-500/20 px-4 py-2 rounded-xl">
            <Coins className="text-yellow-500" size={18} />
            <span className="font-bold text-foreground">10.000 NC</span>
          </div>
          <div className="flex items-center gap-2 bg-background/50 border border-amber-500/20 px-4 py-2 rounded-xl">
            <ShieldAlert className="text-red-500" size={18} />
            <span className="font-bold text-foreground">5 Tiket Penalti</span>
          </div>
        </div>
        
        {claimStatus === "success" && (
          <div className="p-3 bg-green-500/20 border border-green-500/30 text-green-500 font-bold rounded-xl flex items-center justify-center md:justify-start gap-2 text-sm">
            <CheckCircle2 size={16} /> {message}
          </div>
        )}

        {claimStatus === "error" && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 text-red-500 font-bold rounded-xl flex items-center justify-center md:justify-start gap-2 text-sm">
            {message}
          </div>
        )}
      </div>

      <div className="w-full md:w-auto flex flex-col items-center relative z-10">
        {isReady ? (
          <button
            onClick={handleClaim}
            disabled={isClaiming || claimStatus === "success"}
            className="w-full md:w-auto px-8 py-4 bg-linear-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isClaiming ? <Loader2 className="animate-spin" size={20} /> : <Gift size={20} />}
            {isClaiming ? "Memproses..." : "Klaim Sekarang!"}
          </button>
        ) : (
          <div className="w-full md:w-auto px-8 py-4 bg-muted/50 border border-border/50 text-muted-foreground rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-3 shadow-inner">
            <Clock size={20} />
            {daysRemaining} Hari Lagi
          </div>
        )}
        {!isReady && <p className="text-[10px] text-muted-foreground mt-2 font-medium">Batas cooldown (30 hari)</p>}
      </div>
    </div>
  );
}
