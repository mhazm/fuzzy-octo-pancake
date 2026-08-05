"use client";

import { useEffect, useState, useRef } from "react";
import ScratchCard from "@/components/scratch/ScratchCard";
import {
  Coins,
  PartyPopper,
  AlertCircle,
  RefreshCw,
  History,
  Trophy,
  SearchX,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getCurrencyData } from "@/app/dashboard/currency/actions";

type TicketStats = {
  totalTickets: number;
  totalSpent: number;
  totalWon: number;
};

type TicketHistory = {
  _id: string;
  price: number;
  prizeWon: number;
  isWinning: boolean;
  isScratched: boolean;
  createdAt: string;
};

export default function ScratcherClient({
  isDriver = false,
}: {
  isDriver?: boolean;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [history, setHistory] = useState<TicketHistory[]>([]);

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const activeTicketIdRef = useRef<string | null>(null);
  
  // Sync state to ref so fetchDashboardData can access the latest without closure staleness
  useEffect(() => {
    activeTicketIdRef.current = activeTicketId;
  }, [activeTicketId]);

  const [prizeToReveal, setPrizeToReveal] = useState<number>(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch balance using server action
      try {
        const balData = await getCurrencyData();
        setBalance(balData.balance);
      } catch (err) {
        console.error("Failed to fetch balance", err);
      }

      // Fetch history & stats
      const histRes = await fetch("/api/scratchers/history");
      if (histRes.ok) {
        const histData = await histRes.json();
        setStats(histData.stats);
        setHistory(histData.recentTickets);

        // Check if there's an unscratched ticket
        const unscratched = histData.recentTickets.find(
          (t: TicketHistory) => !t.isScratched,
        );
        if (unscratched) {
          // Hanya reset UI jika ini adalah tiket yang BERBEDA.
          // Jika ini tiket yang sedang dimainkan, abaikan (mungkin delay dari database).
          if (activeTicketIdRef.current !== unscratched._id) {
            setActiveTicketId(unscratched._id);
            setPrizeToReveal(unscratched.prizeWon);
            setIsRevealed(false);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch scratcher data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleBuyTicket = async () => {
    if (!isDriver) {
      showToast(
        "Hanya pengemudi resmi Nismara yang dapat membeli tiket!",
        "error",
      );
      return;
    }
    if (!balance || balance < 400) {
      showToast("Saldo N-Coin tidak cukup (Butuh 400 NC)", "error");
      return;
    }

    setIsBuying(true);
    try {
      const res = await fetch("/api/scratchers/buy", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Gagal membeli tiket", "error");
        return;
      }

      if (data.warningLimitReached) {
        showToast(
          "⚠️ Peringatan: Anda telah membeli 50 tiket hari ini! Harap bermain dengan bijak.",
          "error",
        );
      } else {
        showToast("Tiket berhasil dibeli!", "success");
      }

      setActiveTicketId(data.ticketId);
      setPrizeToReveal(data.prizeWon);
      setIsRevealed(false);

      // Refresh balance and stats
      fetchDashboardData();
    } catch (err) {
      showToast("Terjadi kesalahan saat menghubungi server", "error");
    } finally {
      setIsBuying(false);
    }
  };

  const handleScratchComplete = async () => {
    if (!activeTicketId || isRevealed) return;
    setIsRevealed(true);

    try {
      const res = await fetch("/api/scratchers/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: activeTicketId }),
      });

      if (res.ok) {
        if (prizeToReveal > 0) {
          showToast(
            `Selamat! Anda menang ${prizeToReveal.toLocaleString("id-ID")} NC!`,
            "success",
          );
        }
        fetchDashboardData();
      } else {
        const err = await res.json();
        console.error("Failed to reveal:", err);
      }
    } catch (err) {
      console.error("Error revealing ticket:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-sky filter drop-shadow-lg uppercase tracking-tighter">
            Scratch & Win
          </h1>
          <p className="text-muted-foreground font-medium">
            Gosok tiket dan menangkan hingga 20.000 NC!
          </p>
        </div>

        <div className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-full">
            <Coins className="text-primary w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
              Saldo Anda
            </p>
            <p className="font-black text-foreground text-lg">
              {balance !== null ? balance.toLocaleString("id-ID") : "..."}{" "}
              <span className="text-primary text-sm">NC</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Play Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-primary/10 blur-[100px] pointer-events-none" />

            {!activeTicketId ? (
              <div className="text-center max-w-sm z-10">
                <div className="w-20 h-20 bg-primary/20 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight mb-2">
                  Beli Tiket Gosok
                </h2>
                <p className="text-muted-foreground mb-8">
                  Harga 1 tiket adalah{" "}
                  <strong className="text-primary">400 NC</strong>. Anda
                  berkesempatan memenangkan hingga 50x lipat dari harga tiket!
                  {!isDriver && (
                    <span className="block mt-2 text-destructive font-semibold text-sm">
                      (Khusus Supir Nismara)
                    </span>
                  )}
                </p>
                <button
                  onClick={handleBuyTicket}
                  disabled={
                    isBuying || (balance !== null && balance < 400) || !isDriver
                  }
                  className="w-full bg-gradient-to-r from-primary to-accent-sky hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 px-8 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/25 flex items-center justify-center gap-2 border border-white/10"
                >
                  {isBuying ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Coins className="w-5 h-5" />
                  )}
                  Beli Tiket (400 NC)
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center z-10 w-full">
                <div className="mb-6 text-center">
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-1">
                    Tiket Aktif
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    Gosok seluruh area abu-abu di bawah untuk melihat hasil
                  </p>
                </div>

                <div className="relative w-full max-w-[550px] md:h-[260px] bg-[#8bc34a] rounded-2xl shadow-2xl border-[6px] border-[#ffeb3b] overflow-hidden flex flex-col md:flex-row items-center justify-between p-4 md:p-6 gap-6 md:gap-2 mx-auto">
                  {/* Sunburst rays */}
                  <div 
                    className="absolute inset-0 opacity-20 pointer-events-none" 
                    style={{ background: 'repeating-conic-gradient(from 0deg, transparent 0deg 15deg, #ffffff 15deg 30deg)' }} 
                  />
                  
                  {/* Left branding */}
                  <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center w-full">
                    <h2 
                      className="text-4xl md:text-5xl font-black text-[#f44336] leading-none transform -rotate-3" 
                      style={{ WebkitTextStroke: '1px white', textShadow: '3px 3px 0 #000' }}
                    >
                      LUCKY<br/>SCRATCH
                    </h2>
                    <div className="mt-4 flex flex-col items-center justify-center transform rotate-6 bg-[#ffeb3b] border-2 border-white rounded-lg px-4 py-2 shadow-lg shadow-black/20">
                      <span className="text-[#f44336] font-black text-[10px] md:text-xs leading-tight text-center uppercase tracking-widest">
                        Win Up To
                      </span>
                      <span className="text-[#f44336] font-black text-xl md:text-2xl leading-none tracking-tighter" style={{ WebkitTextStroke: '0.5px white', textShadow: '1px 1px 0px #fff' }}>
                        50X!
                      </span>
                    </div>
                  </div>

                  {/* Right Scratch Area */}
                  <div className="relative z-10 flex flex-col items-center bg-black/10 p-3 rounded-2xl border border-black/10 backdrop-blur-sm shrink-0">
                    <div className="text-red-600 font-black text-sm uppercase mb-2 tracking-widest drop-shadow-sm" style={{ WebkitTextStroke: '0.5px white' }}>
                      Scratch Here
                    </div>
                    <div className="shadow-[0_0_15px_rgba(0,0,0,0.4)] rounded-xl overflow-hidden border-2 border-[#ffeb3b] bg-white">
                      <ScratchCard
                        key={activeTicketId} // force re-mount for new ticket
                        width={280}
                        height={140}
                        coverImage="/scratch-cover.webp"
                        brushSize={20}
                        onScratchComplete={handleScratchComplete}
                        revealContent={
                          <div
                            className={`flex flex-col items-center justify-center w-full h-full bg-white text-slate-900 border-4 ${prizeToReveal > 0 ? "border-[#ffeb3b]" : "border-slate-300"} rounded-xl overflow-hidden relative`}
                          >
                            <div
                              className={`absolute inset-0 ${prizeToReveal > 0 ? "bg-amber-100" : "bg-slate-100"} opacity-50`}
                            />
                            <div className="relative z-10 flex flex-col items-center">
                              {prizeToReveal > 0 ? (
                                <>
                                  <PartyPopper className="text-orange-500 w-8 h-8 mb-1 drop-shadow-md" />
                                  <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-orange-600 drop-shadow-sm">
                                    {prizeToReveal.toLocaleString("id-ID")}
                                  </span>
                                  <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">
                                    N-Coin Menang!
                                  </span>
                                </>
                              ) : (
                                <>
                                  <SearchX className="text-slate-400 w-8 h-8 mb-1" />
                                  <span className="text-xl font-black text-slate-500 uppercase">
                                    ZONK
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        }
                      />
                    </div>
                  </div>
                </div>

                {isRevealed && (
                  <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center">
                    <button
                      onClick={() => setActiveTicketId(null)} // Reset to show buy screen
                      className="px-8 py-3 bg-card border border-border hover:bg-muted text-foreground font-black uppercase tracking-widest text-xs rounded-xl transition-colors shadow-sm"
                    >
                      Kembali / Beli Lagi
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rules/Info Box */}
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex gap-4 items-start">
            <AlertCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
            <div>
              <h4 className="font-black text-primary uppercase tracking-tight mb-2">
                Informasi Game
              </h4>
              <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                Setiap tiket berharga 400 NC. Pengacakan hasil dilakukan
                sepenuhnya di sisi server saat pembelian tiket, dan tidak dapat
                dimanipulasi. Hadiah maksimal adalah 50x lipat dari harga tiket
                (20.000 NC). Jika Anda keluar sebelum menggosok, tiket yang
                belum tergosok akan tetap tersimpan dan dapat dilanjutkan nanti.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar / Stats */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-primary" />
              <h3 className="font-black text-foreground uppercase tracking-wider text-lg">
                Statistik Anda
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
                <span className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                  Tiket Dimainkan
                </span>
                <span className="font-black text-foreground">
                  {stats?.totalTickets || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
                <span className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                  Total Pengeluaran
                </span>
                <span className="font-black text-destructive">
                  -{stats?.totalSpent?.toLocaleString("id-ID") || 0} NC
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
                <span className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                  Total Kemenangan
                </span>
                <span className="font-black text-green-500">
                  +{stats?.totalWon?.toLocaleString("id-ID") || 0} NC
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6">
            <h3 className="font-black text-foreground uppercase tracking-wider text-lg mb-4">
              Riwayat Terakhir
            </h3>

            {history.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4 italic">
                Belum ada riwayat permainan.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="flex justify-between items-center p-3 rounded-xl border border-border bg-background/30 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">
                        {new Date(ticket.createdAt).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        Harga: {ticket.price} NC
                      </p>
                    </div>

                    <div className="text-right">
                      {!ticket.isScratched ? (
                        <span className="text-[10px] font-black px-2 py-1 bg-primary/20 text-primary border border-primary/20 rounded-full uppercase tracking-widest">
                          Belum Digosok
                        </span>
                      ) : ticket.isWinning ? (
                        <span className="text-sm font-black text-green-500">
                          +{ticket.prizeWon} NC
                        </span>
                      ) : (
                        <span className="text-sm font-black text-muted-foreground uppercase">
                          ZONK
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      <div
        className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl font-bold text-sm shadow-xl transition-all duration-300 flex items-center gap-3 backdrop-blur-md border z-50 ${
          toast.show
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0 pointer-events-none"
        } ${
          toast.type === "error"
            ? "bg-red-500/10 text-red-400 border-red-500/20"
            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        }`}
      >
        {toast.type === "error" ? (
          <XCircle size={18} />
        ) : (
          <CheckCircle2 size={18} />
        )}
        {toast.message}
      </div>
    </div>
  );
}
