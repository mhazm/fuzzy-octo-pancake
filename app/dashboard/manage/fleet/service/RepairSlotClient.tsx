"use client";

import React, { useState } from "react";
import { Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { showAlert, showConfirm } from "@/lib/dialog";

export default function RepairSlotClient({ slotId, condition }: { slotId: string, condition: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRepair = async () => {
    if (condition >= 100) return;
    
    const confirm = await showConfirm(`Apakah Anda yakin ingin memperbaiki slot ${slotId}? (Gratis)`);
    if (!confirm) return;

    setLoading(true);
    try {
      const res = await fetch("/api/manage/garage/repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });
      
      const data = await res.json();
      if (data.success) {
        await showAlert("Peralatan berhasil diperbaiki!");
        router.refresh();
      } else {
        await showAlert(data.error || "Gagal memperbaiki slot.");
      }
    } catch (err) {
      await showAlert("Terjadi kesalahan sistem.");
    } finally {
      setLoading(false);
    }
  };

  if (condition >= 100) return null;

  return (
    <button
      onClick={handleRepair}
      disabled={loading}
      className="mt-4 w-full py-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-bold text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
    >
      <Wrench size={14} />
      {loading ? "Memperbaiki..." : "Perbaiki Alat"}
    </button>
  );
}
