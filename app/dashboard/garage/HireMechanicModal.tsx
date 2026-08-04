"use client";

import React, { useState } from "react";
import { X, Wrench, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { MECHANIC_LEVELS, MechanicSpecialty } from "@/lib/constants/mechanics";

interface HireMechanicModalProps {
  isOpen: boolean;
  onClose: () => void;
  specialty: MechanicSpecialty;
}

export default function HireMechanicModal({ isOpen, onClose, specialty }: HireMechanicModalProps) {
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isOpen) return null;

  const handleHire = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/garage/mechanics/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialty, level: selectedLevel }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyewa mekanik");
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const levels = Object.values(MECHANIC_LEVELS);
  const selectedConfig = MECHANIC_LEVELS[selectedLevel];

  const specialtyTitle = specialty === "umum" ? "Mekanik Umum" : specialty === "ban" ? "Spesialis Ban" : "Spesialis Mesin & Transmisi";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/50 flex justify-between items-center bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Wrench size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest leading-none">Hire Mechanic</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mt-1">{specialtyTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-3 text-red-500 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pilih Level Mekanik</label>
            <div className="grid gap-2">
              {levels.map((lvl) => (
                <button
                  key={lvl.level}
                  onClick={() => setSelectedLevel(lvl.level)}
                  className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                    selectedLevel === lvl.level 
                      ? "border-primary bg-primary/5 shadow-[0_0_15px_rgba(var(--primary),0.15)]" 
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="text-left">
                    <p className="font-bold text-sm">Level {lvl.level}</p>
                    <p className="text-xs text-muted-foreground font-medium">Boost Kecepatan: <span className="text-emerald-500">+{lvl.boostPercentage}%</span></p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{lvl.salary.toLocaleString("id-ID")} NC</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">/ minggu</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Bayar Awal</span>
              <span className="font-bold text-lg">{selectedConfig.salary.toLocaleString("id-ID")} NC</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
              Gaji ini akan ditagih secara otomatis setiap 7 hari. Jika saldo Anda tidak mencukupi saat jatuh tempo, mekanik akan pergi.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-muted/30 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-card border border-border hover:bg-muted transition-colors uppercase tracking-wider"
            disabled={loading}
          >
            Batal
          </button>
          <button 
            onClick={handleHire}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all uppercase tracking-wider shadow-lg hover:shadow-primary/25 disabled:opacity-50 flex justify-center items-center gap-2"
            disabled={loading}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Hire Sekarang"}
          </button>
        </div>
      </div>
    </div>
  );
}
