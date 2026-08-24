"use client";

import React, { useState, useEffect } from "react";
import { Check, TicketPercent, Loader2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface ClaimButtonProps {
  codeCoupon: string;
  isExpired: boolean;
  hasClaimed: boolean;
  isPending?: boolean;
  startDate?: string | Date;
}

export default function ClaimButton({ codeCoupon, isExpired, hasClaimed: initialHasClaimed, isPending, startDate }: ClaimButtonProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<"idle" | "success" | "error">("idle");
  const [claimMessage, setClaimMessage] = useState("");
  const [hasClaimed, setHasClaimed] = useState(initialHasClaimed);
  const [timeLeft, setTimeLeft] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isPending || !startDate) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(startDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        window.location.reload(); 
        clearInterval(interval);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        let text = "";
        if (days > 0) text += `${days} hari `;
        if (hours > 0) text += `${hours} jam `;
        if (minutes > 0) text += `${minutes} menit `;
        text += `${seconds} detik`;
        
        setTimeLeft(text);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPending, startDate]);

  const handleClaim = async () => {
    setIsClaiming(true);
    setClaimStatus("idle");
    setClaimMessage("");

    try {
      const res = await fetch("/api/coupons/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeCoupon }),
        cache: "no-store",
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setClaimStatus("success");
        setClaimMessage(`Berhasil mendapatkan: ${data.rewardText}`);
        setHasClaimed(true);
        // Refresh router to update the list of claimers in the page
        setTimeout(() => {
          router.refresh();
        }, 1500);
      } else {
        setClaimStatus("error");
        setClaimMessage(data.error || "Gagal klaim kupon.");
      }
    } catch (error) {
      setClaimStatus("error");
      setClaimMessage("Terjadi kesalahan jaringan.");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="mt-6 w-full max-w-xs">
      {claimStatus === "success" && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-bold rounded-xl text-center">
          {claimMessage}
        </div>
      )}
      
      {claimStatus === "error" && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-bold rounded-xl text-center">
          {claimMessage}
        </div>
      )}

      <button
        onClick={handleClaim}
        disabled={isExpired || isPending || hasClaimed || isClaiming || claimStatus === "success"}
        className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all flex justify-center items-center gap-2 ${
          claimStatus === "success" || hasClaimed
            ? "bg-green-500/20 text-green-500 border border-green-500/30 cursor-not-allowed"
            : isPending
            ? "bg-orange-500/20 text-orange-500 border border-orange-500/30 cursor-not-allowed"
            : isExpired
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-white hover:bg-primary/80 shadow-lg shadow-primary/20"
        }`}
      >
        {isClaiming ? (
          <><Loader2 className="animate-spin" size={20} /> Memproses...</>
        ) : claimStatus === "success" || hasClaimed ? (
          <><Check size={20} /> Sudah Diklaim</>
        ) : isPending ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2"><Clock size={20} /> Belum Dimulai</div>
            <span className="text-xs opacity-80 mt-0.5 normal-case font-medium">{timeLeft || "Menghitung..."}</span>
          </div>
        ) : isExpired ? (
          "Kupon Kedaluwarsa"
        ) : (
          <><TicketPercent size={20} /> Klaim Kupon Ini</>
        )}
      </button>
    </div>
  );
}
