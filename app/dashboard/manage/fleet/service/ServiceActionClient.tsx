"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { showAlert, showConfirm } from "@/lib/dialog";


export default function ServiceActionClient({ orderId }: { orderId: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    if (!await showConfirm("Apakah Anda yakin ingin mengonfirmasi servis ini? Saldo NC user akan dipotong.")) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/fleet/maintenance/${orderId}/confirm`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengonfirmasi");
      }

      router.refresh();
    } catch (err: any) {
      await showAlert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!await showConfirm("Apakah Anda yakin ingin menolak permintaan servis ini?")) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/fleet/maintenance/${orderId}/reject`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menolak");
      }

      router.refresh();
    } catch (err: any) {
      await showAlert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleReject}
        disabled={isSubmitting}
        className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50 flex items-center gap-2"
      >
        <X size={14} /> Tolak
      </button>
      <button
        onClick={handleConfirm}
        disabled={isSubmitting}
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-bold uppercase tracking-widest text-xs transition-all disabled:opacity-50 flex items-center gap-2"
      >
        {isSubmitting ? (
          <span className="animate-pulse">Memproses...</span>
        ) : (
          <><Check size={14} /> Konfirmasi</>
        )}
      </button>
    </div>
  );
}
