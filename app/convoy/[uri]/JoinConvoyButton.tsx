"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { joinConvoyAction } from "@/app/actions/convoyActions";
import { Lock, CheckCircle2, ShieldAlert } from "lucide-react";

interface JoinButtonProps {
  convoyId: string;
  isLoggedIn: boolean;
  isDriver: boolean;
  isJoined: boolean;
}

export default function JoinConvoyButton({
  convoyId,
  isLoggedIn,
  isDriver,
  isJoined,
}: JoinButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isLoggedIn) {
    return (
      <button
        disabled
        className="px-6 py-3.5 bg-border/50 text-foreground/40 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-not-allowed"
      >
        Login Driver untuk Join
      </button>
    );
  }

  if (!isDriver) {
    return (
      <button
        disabled
        className="px-6 py-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider rounded-xl cursor-not-allowed flex items-center gap-2"
      >
        <ShieldAlert size={14} /> Akses Driver Diperlukan
      </button>
    );
  }

  if (isJoined) {
    return (
      <div className="px-6 py-3.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold rounded-xl flex items-center gap-2 select-none">
        <CheckCircle2 size={16} /> Terdaftar Tergabung
      </div>
    );
  }

  const handleProcessJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !jobId) return;

    setLoading(true);
    try {
      await joinConvoyAction(convoyId, password, Number(jobId));
      alert("Kamu berhasil terdaftar masuk dalam sesi convoy!");
      setShowModal(false);
      setPassword("");
      setJobId("");
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Gagal melakukan konfirmasi masuk.");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-background border border-border/80 shadow-[0_0_50px_-12px_rgba(0,0,0,1)] max-w-sm w-full p-8 rounded-3xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black mb-1 text-foreground uppercase tracking-tight">
          Autentikasi Lobby
        </h3>
        <p className="text-xs text-foreground/60 mb-6 font-medium leading-relaxed">
          Masukkan password rahasia admin beserta Job ID pekerjaan aktif yang
          Anda jalankan untuk sesi ini.
        </p>

        <form onSubmit={handleProcessJoin} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/60">
              Password Lobby
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password rahasia..."
              className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-foreground font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/60">
              Job ID Pekerjaan
            </label>
            <input
              type="number"
              required
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Contoh: 459102"
              className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-foreground font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="flex justify-end gap-3 text-xs font-bold uppercase tracking-wider pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setPassword("");
                setJobId("");
              }}
              className="px-5 py-2.5 text-foreground/50 hover:text-foreground transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !password || !jobId}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-lg shadow-primary/20"
            >
              {loading ? "Memproses..." : "Konfirmasi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-8 py-3.5 bg-primary text-primary-foreground text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        <Lock size={14} /> Join Sesi Convoy
      </button>

      {/* Me-render modal langsung ke Root Body */}
      {showModal && mounted && createPortal(modalContent, document.body)}
    </>
  );
}
