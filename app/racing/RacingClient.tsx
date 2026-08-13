"use client";

import { useEffect, useState, useRef } from "react";
import {
  Truck,
  Coins,
  RefreshCw,
  Trophy,
  Flag,
  AlertCircle,
  XCircle,
  CheckCircle2,
  History,
  Info,
} from "lucide-react";
import { getCurrencyData } from "@/app/dashboard/currency/actions";

type RaceState = "idle" | "racing" | "finished";

type TicketHistory = {
  _id: string;
  truckId: number;
  winningTruckId: number;
  multiplier: number;
  betAmount: number;
  prizeWon: number;
  isWinning: boolean;
  createdAt: string;
};

type TicketStats = {
  totalTickets: number;
  totalSpent: number;
  totalWon: number;
};

const TRUCKS = [
  { id: 1, name: "Devil", color: "text-red-500", bg: "bg-red-500" },
  { id: 2, name: "Thunder", color: "text-blue-500", bg: "bg-blue-500" },
  { id: 3, name: "Viper", color: "text-green-500", bg: "bg-green-500" },
  { id: 4, name: "Flash", color: "text-yellow-500", bg: "bg-yellow-500" },
  { id: 5, name: "Shadow", color: "text-purple-500", bg: "bg-purple-500" },
  { id: 6, name: "Blaze", color: "text-orange-500", bg: "bg-orange-500" },
  { id: 7, name: "Frost", color: "text-cyan-500", bg: "bg-cyan-500" },
  { id: 8, name: "Titan", color: "text-pink-500", bg: "bg-pink-500" },
];

const MULTIPLIERS = [1, 2, 5, 10];
const BASE_BET = 500;

export default function RacingClient({
  isDriver = false,
}: {
  isDriver?: boolean;
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [history, setHistory] = useState<TicketHistory[]>([]);

  const [selectedTruck, setSelectedTruck] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [raceState, setRaceState] = useState<RaceState>("idle");
  const [positions, setPositions] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0, 0,
  ]); // 0 to 100
  const [winner, setWinner] = useState<number | null>(null);
  const [prizeToReveal, setPrizeToReveal] = useState<number>(0);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const raceInterval = useRef<NodeJS.Timeout | null>(null);
  const truckParamsRef = useRef<
    {
      baseSpeed: number;
      ceiling: number;
      dragStart: number;
      burstChance: number;
      burstPower: number;
    }[]
  >([]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  const fetchDashboardData = async () => {
    try {
      const data = await getCurrencyData();
      setBalance(data.balance);

      const histRes = await fetch("/api/racing/history");
      if (histRes.ok) {
        const histData = await histRes.json();
        setStats(histData.stats);
        setHistory(histData.recentTickets);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Auto-Sync saat player keluar dari halaman (Write-Behind Flush)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        navigator.sendBeacon("/api/racing/sync");
      }
    };
    
    const handlePageHide = () => {
      navigator.sendBeacon("/api/racing/sync");
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      // Saat komponen React di unmount (pindah page via Next.js router)
      fetch("/api/racing/sync", { method: "POST", keepalive: true }).catch(() => {});
    };
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (raceInterval.current) clearInterval(raceInterval.current);
    };
  }, []);

  const totalBet = BASE_BET * multiplier;

  const handleStartRace = async () => {
    if (!selectedTruck) {
      showToast("Pilih jagoan truk Anda terlebih dahulu!", "error");
      return;
    }
    if (balance !== null && balance < totalBet) {
      showToast("Saldo N¢ tidak mencukupi!", "error");
      return;
    }

    setRaceState("racing");
    setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    setWinner(null);
    setPrizeToReveal(0);

    try {
      const res = await fetch("/api/racing/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ truckId: selectedTruck, multiplier }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Gagal memulai balapan", "error");
        setRaceState("idle");
        return;
      }

      // Start rigged race animation based on server's result
      const serverWinnerId = data.winningTruckId;
      setPrizeToReveal(data.prizeWon);

      // Generate unique race parameters per truck for realistic animation
      truckParamsRef.current = TRUCKS.map((_, i) => {
        const isWinner = i + 1 === serverWinnerId;
        return {
          // Slower base speeds for a visible race (~8-12 seconds total)
          baseSpeed: 0.5 + Math.random() * 0.5,
          // Winner reaches 100; losers cap at varied ceilings (85-97)
          ceiling: isWinner ? 100 : 85 + Math.random() * 12,
          // Drag starts late so trucks stay competitive longer
          dragStart: isWinner ? 88 : 65 + Math.random() * 17,
          // Occasional speed bursts for drama & lead changes
          burstChance: 0.08 + Math.random() * 0.07,
          burstPower: 1.6 + Math.random() * 1.0,
        };
      });

      raceInterval.current = setInterval(() => {
        setPositions((prev) => {
          const next = [...prev];
          let potentialWinner = null;
          const params = truckParamsRef.current;

          for (let i = 0; i < next.length; i++) {
            const p = params[i];
            if (!p) continue;

            // Already at ceiling, skip
            if (next[i] >= p.ceiling) {
              next[i] = p.ceiling;
              if (p.ceiling >= 100 && i + 1 === serverWinnerId) {
                potentialWinner = i + 1;
              }
              continue;
            }

            // Calculate speed with gentle deceleration
            let speedMultiplier = 1;

            if (next[i] > p.dragStart) {
              // Linear ease-out with a high floor — slows down but never crawls
              const progress =
                (next[i] - p.dragStart) / (p.ceiling - p.dragStart);
              const clamped = Math.min(progress, 1);
              speedMultiplier = Math.max(0.15, 1 - clamped * 0.85);
            }

            // Random burst for excitement (before and slightly into drag zone)
            if (next[i] < p.dragStart + 10 && Math.random() < p.burstChance) {
              speedMultiplier *= p.burstPower;
            }

            // Natural speed variance per tick (±25%)
            const jitter = 0.75 + Math.random() * 0.5;
            const step = p.baseSpeed * jitter * speedMultiplier;

            next[i] = Math.min(next[i] + step, p.ceiling);

            // Check for winner
            if (next[i] >= 100 && i + 1 === serverWinnerId) {
              next[i] = 100;
              potentialWinner = i + 1;
            }
          }

          if (potentialWinner !== null) {
            clearInterval(raceInterval.current!);
            setTimeout(() => {
              handleRaceFinish(potentialWinner as number);
            }, 0);
          }

          return next;
        });
      }, 60);
    } catch (err) {
      console.error("Error starting race:", err);
      showToast("Terjadi kesalahan jaringan", "error");
      setRaceState("idle");
    }
  };

  const handleRaceFinish = (winningTruckId: number) => {
    setWinner(winningTruckId);
    setRaceState("finished");

    fetchDashboardData(); // Refresh history and balance

    if (winningTruckId === selectedTruck) {
      // It uses the actual server state from `prizeToReveal`, but we can fallback to calculate if it's 0 momentarily
      const reward = totalBet * 3;
      showToast(
        `🏆 Selamat! Truk jagoan Anda menang! Anda mendapat ${reward.toLocaleString("id-ID")} N¢!`,
        "success",
      );
    } else {
      showToast("Sayang sekali, truk Anda kalah. Coba lagi!", "error");
    }
  };

  const resetRace = () => {
    setRaceState("idle");
    setPositions([0, 0, 0, 0, 0, 0, 0, 0]);
    setWinner(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pt-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-sky filter drop-shadow-lg uppercase tracking-tighter">
            Nismara Drag Race
          </h1>
          <p className="text-muted-foreground font-medium">
            Balapan truk virtual. Pilih jagoanmu dan menangkan N¢!
          </p>
          <div className="flex items-start gap-2 mt-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl max-w-lg">
            <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-500/90 leading-relaxed">
              <strong>Info:</strong> Agar balapan berjalan tanpa gangguan jaringan, perubahan saldo sengaja ditangguhkan sementara waktu. Saldo Nismara Coin Anda yang sebenarnya akan disinkronisasi ketika Anda meninggalkan halaman ini.
            </p>
          </div>
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
              <span className="text-primary text-sm">N¢</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Track Area */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 relative overflow-hidden flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-6">
            <Flag className="w-5 h-5 text-primary" />
            <h3 className="font-black text-foreground uppercase tracking-wider text-lg">
              Sirkuit Balap
            </h3>
          </div>

          <div className="relative w-full bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 shadow-inner">
            {/* Start & Finish lines */}
            <div className="absolute top-0 bottom-0 left-12 border-l-4 border-dashed border-white/20 z-0"></div>
            <div className="absolute top-0 bottom-0 right-12 border-l-4 border-dashed border-white/50 z-0 flex items-start">
              <span className="text-white/50 font-black uppercase text-[10px] tracking-widest rotate-90 origin-left mt-4 ml-1">
                FINISH
              </span>
            </div>

            <div className="space-y-4 relative z-10">
              {TRUCKS.map((truck, idx) => (
                <div
                  key={truck.id}
                  className="relative h-10 flex items-center group"
                >
                  {/* Track line */}
                  <div className="absolute inset-0 bg-black/20 rounded-full"></div>

                  {/* Truck */}
                  <div
                    className="absolute left-0 transition-all duration-100 ease-linear flex items-center justify-center"
                    style={{ left: `calc(${positions[idx]}% * 0.85)` }}
                  >
                    <div
                      className={`p-2 rounded-lg ${truck.bg} shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center transform ${raceState === "racing" ? "scale-110 -rotate-2" : ""} transition-transform`}
                    >
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Truck Name Label */}
                  <span
                    className={`absolute left-2 text-[10px] font-bold uppercase tracking-widest opacity-50 ${truck.color}`}
                  >
                    {truck.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {raceState === "finished" && winner !== null && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in zoom-in duration-300 rounded-3xl">
              <Trophy
                className={`w-20 h-20 mb-4 ${TRUCKS[winner - 1].color}`}
              />
              <h2 className="text-3xl font-black text-foreground uppercase tracking-tight mb-2 text-center">
                Pemenang:
                <br />
                <span className={TRUCKS[winner - 1].color}>
                  {TRUCKS[winner - 1].name}
                </span>
              </h2>
              {selectedTruck === winner ? (
                <p className="text-xl font-bold text-emerald-500 mb-6 drop-shadow-md">
                  Anda Menang {(totalBet * 3).toLocaleString("id-ID")} N¢!
                </p>
              ) : (
                <p className="text-xl font-bold text-destructive mb-6">
                  Sayang Sekali, Anda Kalah!
                </p>
              )}
              <button
                onClick={resetRace}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest py-3 px-8 rounded-xl transition-all shadow-lg"
              >
                Main Lagi
              </button>
            </div>
          )}
        </div>

        {/* Betting Panel */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Coins className="w-5 h-5 text-primary" />
            <h3 className="font-black text-foreground uppercase tracking-wider text-lg">
              Area Taruhan
            </h3>
          </div>

          <div className="space-y-6 flex-1">
            {/* Choose Truck */}
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Pilih Truk Anda
              </p>
              <div className="grid grid-cols-4 gap-2">
                {TRUCKS.map((truck) => (
                  <button
                    key={truck.id}
                    onClick={() =>
                      raceState === "idle" && setSelectedTruck(truck.id)
                    }
                    disabled={raceState !== "idle"}
                    className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all ${
                      selectedTruck === truck.id
                        ? `border-${truck.bg.split("-")[1]}-500 bg-${truck.bg.split("-")[1]}-500/10`
                        : "border-border/50 hover:border-primary/50 bg-background/50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <Truck className={`w-6 h-6 mb-1 ${truck.color}`} />
                    <span className="text-[10px] font-black uppercase tracking-tight text-foreground text-center">
                      {truck.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Choose Multiplier */}
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Pengali Taruhan
              </p>
              <div className="grid grid-cols-4 gap-2">
                {MULTIPLIERS.map((m) => (
                  <button
                    key={m}
                    onClick={() => raceState === "idle" && setMultiplier(m)}
                    disabled={raceState !== "idle"}
                    className={`py-2 rounded-lg font-black text-sm border-2 transition-all ${
                      multiplier === m
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/50"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    x{m}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-background/50 border border-border/50 rounded-xl p-4 mt-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground font-bold uppercase text-xs tracking-widest">
                  Total Taruhan:
                </span>
                <span className="text-xl font-black text-foreground">
                  {totalBet.toLocaleString("id-ID")} N¢
                </span>
              </div>
              <button
                onClick={handleStartRace}
                disabled={
                  raceState !== "idle" ||
                  !selectedTruck ||
                  (balance !== null && balance < totalBet) ||
                  !isDriver
                }
                className="w-full bg-gradient-to-r from-primary to-accent-sky hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest py-4 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {raceState === "racing" ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Flag className="w-5 h-5" />
                )}
                {raceState === "racing" ? "Balapan..." : "Mulai"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Box */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 flex gap-4 items-start">
        <AlertCircle className="w-6 h-6 text-primary shrink-0 mt-1" />
        <div>
          <h4 className="font-black text-primary uppercase tracking-tight mb-2">
            Informasi & Aturan Main
          </h4>
          <p className="text-sm text-foreground/80 leading-relaxed font-medium">
            Setiap taruhan balapan diawali dari 500 N¢. Terdapat 8 truk yang
            bertanding, sehingga peluang menang adalah 12,5%. Hasil balapan
            (truk yang menang) diacak sepenuhnya di sisi server saat Anda
            menekan tombol mulai, sehingga tidak dapat dimanipulasi. Jika jagoan
            Anda menang, Anda berhak mendapatkan hadiah 3x lipat dari total
            taruhan Anda. Mainkan dengan bijak!
          </p>
        </div>
      </div>

      {/* History and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-black text-foreground uppercase tracking-wider text-lg">
              Statistik Balapan
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
              <span className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                Balapan Diikuti
              </span>
              <span className="font-black text-foreground">
                {stats?.totalTickets || 0}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
              <span className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                Total Taruhan
              </span>
              <span className="font-black text-destructive">
                -{stats?.totalSpent?.toLocaleString("id-ID") || 0} N¢
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-background/50 border border-border/50">
              <span className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                Total Hadiah
              </span>
              <span className="font-black text-green-500">
                +{stats?.totalWon?.toLocaleString("id-ID") || 0} N¢
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 glass-panel rounded-3xl p-6">
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
                      {new Date(ticket.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Truck
                        className={`w-4 h-4 ${TRUCKS[ticket.truckId - 1]?.color}`}
                      />
                      Pilihan: {TRUCKS[ticket.truckId - 1]?.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Taruhan: {ticket.betAmount} N¢
                    </p>
                  </div>

                  <div className="text-right">
                    {ticket.isWinning ? (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black px-2 py-1 bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-full uppercase tracking-widest mb-1">
                          Menang
                        </span>
                        <span className="text-sm font-black text-emerald-500">
                          +{ticket.prizeWon} N¢
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black px-2 py-1 bg-slate-500/20 text-slate-400 border border-slate-500/20 rounded-full uppercase tracking-widest mb-1">
                          Kalah (Menang:{" "}
                          {TRUCKS[ticket.winningTruckId - 1]?.name})
                        </span>
                        <span className="text-sm font-black text-destructive">
                          -{ticket.betAmount} N¢
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
