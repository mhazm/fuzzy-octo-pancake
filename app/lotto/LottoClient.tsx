"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotification } from "@/components/ui/NotificationProvider";
import { Ticket, Wand2, Loader2 } from "lucide-react";

interface LottoClientProps {
  periodId: string;
  userNC: number;
  ticketsBought: number;
  isDriver: boolean;
}

export default function LottoClient({ periodId, userNC, ticketsBought, isDriver }: LottoClientProps) {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const TICKET_PRICE = 500;
  const MAX_TICKETS = 10;
  const MAX_NUMBERS = 4;
  const NUMBER_RANGE = 69;

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter(n => n !== num));
    } else {
      if (selectedNumbers.length < MAX_NUMBERS) {
        setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
      }
    }
  };

  const handleQuickPick = () => {
    const newNumbers: number[] = [];
    while (newNumbers.length < MAX_NUMBERS) {
      const randomNum = Math.floor(Math.random() * NUMBER_RANGE) + 1;
      if (!newNumbers.includes(randomNum)) {
        newNumbers.push(randomNum);
      }
    }
    setSelectedNumbers(newNumbers.sort((a, b) => a - b));
  };

  const handleBuy = async () => {
    if (!isDriver) {
      showNotification("error", "Hanya Driver resmi yang bisa membeli tiket.");
      return;
    }

    if (selectedNumbers.length !== MAX_NUMBERS) {
      showNotification("error", `Pilih tepat ${MAX_NUMBERS} angka.`);
      return;
    }

    if (userNC < TICKET_PRICE) {
      showNotification("error", "Saldo Nismara Coin tidak mencukupi.");
      return;
    }

    if (ticketsBought >= MAX_TICKETS) {
      showNotification("error", "Anda sudah mencapai batas maksimal 10 tiket minggu ini.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/lotto/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numbers: selectedNumbers }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("success", "Tiket berhasil dibeli!");
        setSelectedNumbers([]);
        router.refresh(); // Refresh page to update balance and tickets
      } else {
        showNotification("error", data.error || "Gagal membeli tiket");
      }
    } catch (err) {
      showNotification("error", "Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Ticket size={120} />
      </div>
      
      <h2 className="text-xl font-black uppercase tracking-wider mb-2">Beli Tiket Baru</h2>
      <p className="text-muted-foreground text-sm mb-6">Pilih 4 angka keberuntunganmu dari 1 hingga 69.</p>

      {/* Selected Numbers Display */}
      <div className="flex gap-4 mb-6">
        {[...Array(MAX_NUMBERS)].map((_, i) => (
          <div key={i} className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-xl font-black transition-all ${
            selectedNumbers[i] 
              ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)] scale-110" 
              : "border-border/50 bg-muted/20 text-muted-foreground"
          }`}>
            {selectedNumbers[i] ? selectedNumbers[i].toString().padStart(2, '0') : "?"}
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-8">
        <button
          onClick={handleQuickPick}
          className="flex-1 py-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-border/50"
        >
          <Wand2 size={18} className="text-primary" /> Quick Pick
        </button>
        <button
          onClick={() => setSelectedNumbers([])}
          className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl font-bold transition-colors border border-red-500/20"
        >
          Reset
        </button>
      </div>

      {/* Number Grid */}
      <div className="mb-8">
        <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-10 xl:grid-cols-12 gap-1.5">
          {[...Array(NUMBER_RANGE)].map((_, i) => {
            const num = i + 1;
            const isSelected = selectedNumbers.includes(num);
            return (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                className={`h-9 w-full rounded-md text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/80 border border-border/20"
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-border/50">
        <div>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Harga Tiket</p>
          <p className="font-black text-lg text-primary">{TICKET_PRICE} NC</p>
        </div>
        <button
          onClick={handleBuy}
          disabled={isLoading || selectedNumbers.length !== MAX_NUMBERS || ticketsBought >= MAX_TICKETS || !isDriver}
          className={`px-8 py-3 rounded-xl font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            selectedNumbers.length === MAX_NUMBERS && ticketsBought < MAX_TICKETS && isDriver
              ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.3)]"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {isLoading ? (
            <><Loader2 size={18} className="animate-spin" /> Memproses...</>
          ) : ticketsBought >= MAX_TICKETS ? (
            "Limit Harian (10/10)"
          ) : !isDriver ? (
            "Driver Only"
          ) : selectedNumbers.length !== MAX_NUMBERS ? (
            "Pilih 4 Angka"
          ) : (
            <><Ticket size={18} /> Beli Tiket</>
          )}
        </button>
      </div>
      
      {isDriver && (
        <div className="mt-3 text-center text-xs text-muted-foreground font-medium">
          Saldo Anda: <span className="text-primary font-bold">{userNC.toLocaleString()} NC</span>
        </div>
      )}
    </div>
  );
}
