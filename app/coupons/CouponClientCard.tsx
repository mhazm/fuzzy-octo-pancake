"use client";

import React, { useState } from "react";
import { Copy, Check, TicketPercent, Coins, ShieldAlert, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface Coupon {
  _id: string;
  guildId: string;
  nameCoupon: string;
  codeCoupon: string;
  type?: "NC" | "PENALTY_TICKET";
  minAmount: number;
  maxAmount: number;
  totalNcClaimed: number;
  imageUrl: string | null;
  setBy: string;
  startDate: Date | string;
  endDate: Date | string;
  durationDays: number;
  driverClaims: any[];
  isActive: boolean;
}

const formatDate = (dateString: string | Date) => {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
};

export default function CouponClientCard({ coupon }: { coupon: Coupon }) {
  const [copied, setCopied] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState<"idle" | "success" | "error">("idle");
  const [claimMessage, setClaimMessage] = useState("");

  const { data: session } = useSession();
  const currentUserId = session?.user?.discordId ? String(session.user.discordId) : null;
  const isDriver = session?.user?.isDriver;

  const hasClaimed = currentUserId && coupon.driverClaims?.some((c: any) => c.discordId === currentUserId);
  const isExpired = new Date() > new Date(coupon.endDate) || !coupon.isActive;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.codeCoupon);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async () => {
    if (!currentUserId) {
      setClaimStatus("error");
      setClaimMessage("Harap login terlebih dahulu.");
      return;
    }
    
    if (!isDriver) {
      setClaimStatus("error");
      setClaimMessage("Hanya Pengemudi (Driver) Nismara yang bisa mengeklaim kupon.");
      return;
    }
    
    setIsClaiming(true);
    setClaimStatus("idle");
    setClaimMessage("");

    try {
      const res = await fetch("/api/coupons/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeCoupon: coupon.codeCoupon }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setClaimStatus("success");
        setClaimMessage(`Berhasil mendapatkan: ${data.rewardText}`);
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

  const isNC = !coupon.type || coupon.type === "NC";

  return (
    <div className="bg-card/50 backdrop-blur-md rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/20 hover:border-primary/50 group">
      {/* Gambar Kupon */}
      {coupon.imageUrl ? (
        <div className="relative w-full h-48 bg-muted overflow-hidden">
          <img
            src={coupon.imageUrl}
            alt={coupon.nameCoupon}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-card to-transparent" />
        </div>
      ) : (
        <div className={`relative w-full h-48 bg-linear-to-br flex items-center justify-center overflow-hidden ${isNC ? "from-yellow-500/20 to-orange-500/20" : "from-red-500/20 to-rose-500/20"}`}>
          <span className="text-white text-6xl font-bold opacity-30 drop-shadow-xl transform group-hover:scale-125 transition-transform duration-500">
            {isNC ? "🪙" : "🛡️"}
          </span>
          <div className="absolute inset-0 bg-linear-to-t from-card to-transparent" />
        </div>
      )}

      {/* Konten Kupon */}
      <div className="p-6 flex-1 flex flex-col relative z-10 -mt-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {coupon.nameCoupon}
          </h3>
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm border ${
              coupon.isActive && !isExpired
                ? "bg-green-500/10 text-green-500 border-green-500/30" 
                : "bg-muted text-foreground/50 border-border"
            }`}
          >
            {coupon.isActive && !isExpired ? "Aktif" : "Selesai"}
          </span>
        </div>

        <div className="bg-background/50 rounded-xl p-3 mb-5 text-center border border-dashed border-primary/30 group-hover:border-primary/60 transition-colors">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest font-bold">Kode Kupon</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl font-black text-primary tracking-[0.2em]">{coupon.codeCoupon}</span>
            <button
              onClick={handleCopy}
              className="p-1.5 hover:bg-primary/20 rounded-md transition-colors text-primary"
              title="Salin Kode"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-6 flex-1">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              {isNC ? <Coins size={16} className="text-yellow-500"/> : <ShieldAlert size={16} className="text-red-500"/>}
              Rentang Hadiah
            </span>
            <span className="font-bold text-foreground">
              {isNC ? `${coupon.minAmount.toLocaleString("id-ID")} - ${coupon.maxAmount.toLocaleString("id-ID")} NC` : `${coupon.minAmount} - ${coupon.maxAmount} Tiket`}
            </span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Berlaku Hingga</span>
            <span className="font-medium text-foreground">{formatDate(coupon.endDate)}</span>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Diklaim Oleh</span>
            <span className="font-medium text-foreground">{coupon.driverClaims?.length || 0} Pengemudi</span>
          </div>
        </div>

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
          className={`w-full py-3 rounded-xl font-bold uppercase tracking-widest transition-all flex justify-center items-center gap-2 ${
            claimStatus === "success" || hasClaimed
              ? "bg-green-500/20 text-green-500 border border-green-500/30 cursor-not-allowed"
              : isExpired
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary/80 shadow-lg shadow-primary/20"
          }`}
        >
          {isClaiming ? (
            <><Loader2 className="animate-spin" size={18} /> Memproses...</>
          ) : claimStatus === "success" || hasClaimed ? (
            <><Check size={18} /> Diklaim</>
          ) : isExpired ? (
            "Kedaluwarsa"
          ) : (
            <><TicketPercent size={18} /> Klaim Kupon</>
          )}
        </button>
      </div>
    </div>
  );
}
