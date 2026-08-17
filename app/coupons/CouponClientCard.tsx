"use client";

import React from "react";
import Link from "next/link";
import { Coins, ShieldAlert, ArrowRight } from "lucide-react";
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
  const { data: session } = useSession();
  const isDriver = session?.user?.isDriver;

  const isExpired = new Date() > new Date(coupon.endDate) || !coupon.isActive;
  
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
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {coupon.nameCoupon}
          </h3>
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm border flex-shrink-0 ${
              coupon.isActive && !isExpired
                ? "bg-green-500/10 text-green-500 border-green-500/30" 
                : "bg-muted text-foreground/50 border-border"
            }`}
          >
            {coupon.isActive && !isExpired ? "Aktif" : "Selesai"}
          </span>
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

        {isDriver ? (
          <Link
            href={`/coupons/${coupon.codeCoupon}`}
            className="w-full py-3 rounded-xl font-bold uppercase tracking-widest transition-all flex justify-center items-center gap-2 bg-primary text-white hover:bg-primary/80 shadow-lg shadow-primary/20"
          >
            Lihat Detail Kupon <ArrowRight size={18} />
          </Link>
        ) : (
          <div className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-center bg-muted text-muted-foreground border border-border">
            Hanya Untuk Driver
          </div>
        )}
      </div>
    </div>
  );
}
