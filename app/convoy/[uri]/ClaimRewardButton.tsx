"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { claimConvoyRewardAction } from "@/app/actions/convoyActions";
import { Gift, Loader2, CheckCircle, AlertCircle, PartyPopper } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export default function ClaimRewardButton({ convoyId, hasClaimed }: { convoyId: string, hasClaimed?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleClaim = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await claimConvoyRewardAction(convoyId);
      setSuccessMsg(res.message || "Berhasil klaim hadiah!");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal melakukan klaim hadiah.");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSuccessMsg(null);
    router.refresh();
  };

  if (hasClaimed) {
    return (
      <button
        disabled
        className="w-full py-4 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 font-black uppercase tracking-wider rounded-xl text-sm flex justify-center items-center gap-2 cursor-not-allowed"
      >
        <CheckCircle size={18} />
        Hadiah Sudah Diklaim
      </button>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3 relative">
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          {errorMsg}
        </div>
      )}

      <Modal
        isOpen={!!successMsg}
        onClose={handleCloseModal}
        title="Klaim Berhasil!"
      >
        <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-2">
            <PartyPopper size={32} />
          </div>
          <h3 className="text-xl font-black text-foreground">Terima Kasih!</h3>
          <p className="text-sm text-foreground/70 leading-relaxed max-w-[280px]">
            Terima kasih telah berpartisipasi dan menyelesaikan event convoy ini dengan baik.
          </p>
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black px-4 py-3 rounded-xl w-full text-center my-2 text-lg">
            {successMsg}
          </div>
          <button
            onClick={handleCloseModal}
            className="w-full py-3.5 bg-primary text-primary-foreground font-black uppercase tracking-wider rounded-xl transition-all shadow-xl hover:scale-105 active:scale-95 text-sm"
          >
            Tutup & Lanjutkan
          </button>
        </div>
      </Modal>

      <button
        onClick={handleClaim}
        disabled={loading || !!successMsg}
        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-xl hover:scale-105 active:scale-95 text-sm flex justify-center items-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <Gift size={18} />}
        {loading ? "Memproses..." : "Klaim Hadiah Convoy"}
      </button>
    </div>
  );
}
