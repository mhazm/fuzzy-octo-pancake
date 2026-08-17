"use client";

import React, { useState } from "react";
import { Check, TicketPercent, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ClaimButtonProps {
  codeCoupon: string;
  isExpired: boolean;
  hasClaimed: boolean;
}

export default function ClaimButton({ codeCoupon, isExpired, hasClaimed: initialHasClaimed }: ClaimButtonProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<"idle" | "success" | "error">("idle");
  const [claimMessage, setClaimMessage] = useState("");
  const [hasClaimed, setHasClaimed] = useState(initialHasClaimed);
  const router = useRouter();

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
        disabled={isExpired || hasClaimed || isClaiming || claimStatus === "success"}
        className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all flex justify-center items-center gap-2 ${
          claimStatus === "success" || hasClaimed
            ? "bg-green-500/20 text-green-500 border border-green-500/30 cursor-not-allowed"
            : isExpired
            ? "bg-muted text-muted-foreground cursor-not-allowed"
            : "bg-primary text-white hover:bg-primary/80 shadow-lg shadow-primary/20"
        }`}
      >
        {isClaiming ? (
          <><Loader2 className="animate-spin" size={20} /> Memproses...</>
        ) : claimStatus === "success" || hasClaimed ? (
          <><Check size={20} /> Sudah Diklaim</>
        ) : isExpired ? (
          "Kupon Kedaluwarsa"
        ) : (
          <><TicketPercent size={20} /> Klaim Kupon Ini</>
        )}
      </button>
    </div>
  );
}
