"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { endConvoyAction } from "@/app/actions/convoyActions";
import { Flag, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function EndConvoyButton({ convoyId }: { convoyId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  const handleEnd = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await endConvoyAction(convoyId);
      setMessage({ type: "success", text: res.message || "Berhasil mengakhiri convoy!" });
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal mengakhiri convoy." });
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 relative group">
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} className={`absolute z-10 bottom-full mb-2 right-0 w-64 ${message.type === "success" ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" : ""}`}>
          <AlertTitle className="text-xs">{message.type === "success" ? "Berhasil" : "Error"}</AlertTitle>
          <AlertDescription className="text-[10px]">
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {confirming ? (
        <div className="flex gap-1 bg-red-500/20 rounded-xl p-1 border border-red-500/30">
          <button
            onClick={() => setConfirming(false)}
            className="p-1.5 px-3 text-[10px] uppercase font-bold text-foreground/70 hover:text-foreground transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleEnd}
            disabled={loading || message?.type === "success"}
            className="p-1.5 px-3 text-[10px] uppercase font-bold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Akhiri Sesi"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="w-full py-4 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 rounded-xl transition-all text-red-500 shadow-lg shadow-red-500/5 flex items-center justify-center gap-2 group font-black uppercase tracking-wider text-sm"
          title="Akhiri Convoy Sekarang"
        >
          <Flag size={18} className="group-hover:scale-110 transition-transform" />
          Akhiri Sesi Convoy
        </button>
      )}
    </div>
  );
}
