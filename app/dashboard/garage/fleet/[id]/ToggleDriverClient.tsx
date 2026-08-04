"use client";

import React, { useState } from "react";
import { UserCheck, UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";

interface ToggleDriverClientProps {
  fleetId: string;
  isAssignedToMe: boolean;
}

export default function ToggleDriverClient({
  fleetId,
  isAssignedToMe,
}: ToggleDriverClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/fleet/${fleetId}/toggle-driver`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah status driver");
      }

      // Refresh the page to reflect the new state
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`px-6 py-3 rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest transition-all shadow-lg hover:-translate-y-0.5 ${
        isAssignedToMe
          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white"
          : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isLoading ? (
        "Memproses..."
      ) : isAssignedToMe ? (
        <>
          <UserMinus size={18} /> Lepas (Unassign)
        </>
      ) : (
        <>
          <UserCheck size={18} /> Gunakan (Assign)
        </>
      )}
    </button>
  );
}
