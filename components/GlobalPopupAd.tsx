"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { X } from "lucide-react";
import { getPopupConfig } from "@/app/actions/popupActions";
import { Button } from "./ui/button";

export default function GlobalPopupAd() {
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Tampilkan hanya jika user sudah login dan driver
    if (!session?.user?.isDriver) return;

    const fetchConfig = async () => {
      try {
        const data = await getPopupConfig();
        if (!data || !data.isActive) return;

        // Cek localStorage cooldown
        const snoozedUntil = localStorage.getItem("nismara_global_popup_snooze");
        if (snoozedUntil) {
          const snoozedTime = parseInt(snoozedUntil, 10);
          if (Date.now() < snoozedTime) {
            return; // Masih dalam masa snooze
          }
        }

        setConfig(data);
        // Delay dikit supaya nggak kaget
        setTimeout(() => setIsVisible(true), 2500);
      } catch (err) {
        console.error("Gagal mendapatkan config popup:", err);
      }
    };

    fetchConfig();
  }, [session]);

  const handleClose = () => {
    setIsVisible(false);
    if (config?.cooldownHours) {
      const nextTime = Date.now() + config.cooldownHours * 60 * 60 * 1000;
      localStorage.setItem("nismara_global_popup_snooze", nextTime.toString());
    }
  };

  if (!isVisible || !config) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-md animate-in fade-in duration-500" 
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-[420px] bg-card border border-primary/20 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-primary/10 animate-in zoom-in-95 fade-in duration-500">
        
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-background/50 backdrop-blur-md border border-border text-foreground hover:bg-foreground/10 transition-colors"
          aria-label="Tutup"
        >
          <X size={16} />
        </button>

        {config.imageUrl && (
          <div className="w-full h-56 relative bg-muted">
            <img src={config.imageUrl} alt="Popup Image" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-card to-transparent" />
          </div>
        )}

        <div className={`p-8 text-center space-y-5 ${config.imageUrl ? '-mt-10 relative z-10' : ''}`}>
          <h2 className="text-3xl font-black text-foreground uppercase tracking-tight leading-none italic">
            {config.title}
          </h2>
          
          <p className="text-[15px] text-foreground/70 leading-relaxed font-medium">
            {config.description}
          </p>

          <div className="pt-2">
            <Link href={config.actionLink} onClick={handleClose} className="w-full">
              <Button className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/20 hover:scale-105 transition-transform active:scale-95">
                {config.actionText}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
