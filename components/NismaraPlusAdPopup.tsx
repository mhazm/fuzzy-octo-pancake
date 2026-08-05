"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { X, Sparkles, TrendingUp, ShieldAlert, ArrowRight } from "lucide-react";
import { NismaraIcon } from "./icons/SocialMedia";

export default function NismaraPlusAdPopup() {
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Hanya tampilkan ke user yang sudah login dan merupakan driver
    if (!session?.user?.isDriver) return;

    // Jangan tampilkan jika sudah berlangganan
    if (session?.user?.nismaraplus?.status === true) return;

    // Cek cooldown dari localStorage (6 jam)
    const snoozedUntil = localStorage.getItem("nismaraPlus_ad_snoozed_until");
    if (snoozedUntil) {
      const snoozedTime = parseInt(snoozedUntil, 10);
      if (Date.now() < snoozedTime) {
        return; // Masih dalam masa snooze
      }
    }

    // Delay sedikit agar tidak terlalu mengagetkan (3 detik setelah halaman load)
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [session]);

  const handleClose = () => {
    setIsVisible(false);
    // Snooze selama 6 jam (6 * 60 * 60 * 1000)
    const nextTime = Date.now() + 6 * 60 * 60 * 1000;
    localStorage.setItem("nismaraPlus_ad_snoozed_until", nextTime.toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-[350px] max-w-[90vw] animate-in fade-in slide-in-from-bottom-10 duration-700 shadow-2xl">
      <div className="bg-card border border-amber-500/30 rounded-2xl overflow-hidden shadow-xl shadow-amber-900/20 relative">
        {/* Glow Effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="p-5 relative z-10">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400 shrink-0">
              <NismaraIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-amber-400 tracking-tight uppercase text-sm">
                Nismara+ VIP
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                Tingkatkan Karir Anda
              </p>
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <p className="text-sm text-foreground/90 leading-relaxed font-medium">
              Dukung Nismara Transport dan nikmati benefit eksklusif yang mempermudah operasional armada Anda!
            </p>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Sparkles size={12} className="text-amber-400" /> Diskon Beli Armada Baru
              </li>
              <li className="flex items-center gap-2">
                <ShieldAlert size={12} className="text-amber-400" /> Potongan Biaya Denda Kerusakan
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp size={12} className="text-amber-400" /> Bonus Tambahan XP Driver
              </li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Link
              href="/dashboard/nismaraplus"
              onClick={handleClose}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              Lihat Detail <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
