"use client";

import { useState } from "react";
import { Edit2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { showAlert } from "@/lib/dialog";

export default function FleetNameEditorClient({
  fleetId,
  currentCustomName,
  modelName,
  isOwner,
}: {
  fleetId: string;
  currentCustomName: string | null;
  modelName: string;
  isOwner: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(currentCustomName || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/fleet/${fleetId}/custom-name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customName: newName }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        await showAlert(data.error || "Gagal mengganti nama");
      }
    } catch (error) {
      console.error(error);
      await showAlert("Terjadi kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = currentCustomName || modelName;

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <input
            type="text"
            className="bg-background border border-border rounded-lg px-3 py-1 font-black text-2xl md:text-4xl text-foreground tracking-tighter w-[300px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder={modelName}
            maxLength={30}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-full transition-colors disabled:opacity-50"
            title="Simpan Nama"
          >
            <Check size={24} />
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setNewName(currentCustomName || "");
            }}
            disabled={isSubmitting}
            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-full transition-colors disabled:opacity-50"
            title="Batal"
          >
            <X size={24} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Kosongkan kolom lalu tekan centang untuk me-reset ke nama asli.</p>
      </div>
    );
  }

  return (
    <h1 className="text-4xl font-black text-foreground tracking-tighter flex items-center gap-3">
      {displayName}
      {isOwner && (
        <button
          onClick={() => setIsEditing(true)}
          className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
          title="Ganti Nama Truk"
        >
          <Edit2 size={24} />
        </button>
      )}
    </h1>
  );
}
